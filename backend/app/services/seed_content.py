"""Idempotent seeder for rich course landing content (modules / features / reviews).

Adds 8 modules, 6 features and 4 reviews per course if missing.
Run after the main seed:
    uv run python -m app.services.seed_content
"""
from __future__ import annotations

import asyncio
import random

import structlog
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.course import Course
from app.models.course_content import CourseFeature, CourseModule, CourseReview

logger = structlog.get_logger(__name__)


# Per-language curriculum templates — 8 modules for 16-week / 32-lesson courses
CURRICULA: dict[str, list[tuple[str, str]]] = {
    "en": [
        ("Foundations: Sounds & Scripts", "Phonetics, alphabet refresh, listening warm-ups."),
        ("Everyday Talk", "Greetings, small talk, ordering food, asking directions."),
        ("Past Tenses Workshop", "Past Simple vs Past Continuous vs Past Perfect, with stories."),
        ("Travel & Culture", "Booking, airports, hotels, cross-cultural etiquette."),
        ("Work & Careers", "CV vocabulary, interview phrases, business email."),
        ("Opinions & Debate", "Agreeing/disagreeing, modal verbs, argumentation."),
        ("Storytelling", "Narrative tenses, descriptive adjectives, structuring a story."),
        ("Cambridge Mock Exam", "Speaking, writing, listening, reading sections under timed conditions."),
    ],
    "de": [
        ("Lautsystem und Grußformeln", "Aussprache, Begrüßung, Vorstellung."),
        ("Akkusativ und Dativ", "Fallsystem, Präpositionen, Sätze bauen."),
        ("Tagesablauf", "Uhrzeit, Tätigkeiten, Kalender."),
        ("Reisen in Deutschland", "Bahnhof, Hotel, Sehenswürdigkeiten."),
        ("Beruf und Bewerbung", "Lebenslauf, Anschreiben, Vorstellungsgespräch."),
        ("Modalverben Workshop", "können, müssen, dürfen, mögen — im Kontext."),
        ("Geschichten erzählen", "Perfekt vs Präteritum, Erzähltechniken."),
        ("Probetest Goethe-Zertifikat", "Lesen, Hören, Schreiben, Sprechen."),
    ],
    "fr": [
        ("Sons et Salutations", "Phonétique du français, présentations."),
        ("Quotidien à Paris", "Café, métro, supermarché — vocabulaire pratique."),
        ("Passé Composé vs Imparfait", "Atelier sur les temps du passé."),
        ("Voyage en France", "Réservations, restaurants, culture régionale."),
        ("Le Monde du Travail", "CV, entretien, courriel professionnel."),
        ("Subjonctif sans peur", "Quand l'utiliser, expressions courantes."),
        ("Conversations Polies", "Formules de politesse, débats, expressions idiomatiques."),
        ("DELF Mock", "Compréhension orale et écrite, production orale."),
    ],
    "it": [
        ("Suoni e Saluti", "Fonetica e prime conversazioni."),
        ("Mangiare in Italia", "Ristorante, mercato, ricette."),
        ("Passato Prossimo e Imperfetto", "Tempi del passato in pratica."),
        ("Viaggiare in Italia", "Treno, città d'arte, dialetti."),
        ("Lavoro e Famiglia", "Vocabolario professionale e familiare."),
        ("Congiuntivo dolce", "Costruzioni con il congiuntivo."),
        ("Conversazione e Cultura", "Cinema, musica, dibattiti."),
        ("CILS / CELI Mock", "Prova d'esame ufficiale."),
    ],
    "es": [
        ("Sonidos y Saludos", "Fonética, abecedario, presentaciones."),
        ("Vida cotidiana", "Café, mercado, transporte público."),
        ("Pretérito Indefinido vs Imperfecto", "Talleres de tiempos del pasado."),
        ("Viajar por España y Latinoamérica", "Variedades regionales del español."),
        ("Trabajo y Carrera", "CV, entrevista, correo electrónico."),
        ("Subjuntivo sin miedo", "Construcciones del subjuntivo."),
        ("Conversación y Cultura", "Música, cine, debates."),
        ("DELE Mock", "Examen oficial DELE."),
    ],
    "zh": [
        ("拼音 & 声调", "Pinyin, four tones, basic greetings."),
        ("数字与时间", "Numbers, dates, telling time."),
        ("家庭与朋友", "Family vocabulary, introductions."),
        ("买东西", "Shopping in markets and stores."),
        ("旅游中国", "Travel vocabulary, transport, hotels."),
        ("工作与学习", "Work, studies, CV vocabulary."),
        ("故事与节日", "Storytelling and Chinese festivals."),
        ("HSK 1-2 Mock", "Mock HSK exam, listening and reading."),
    ],
    "ja": [
        ("ひらがな・カタカナ", "Hiragana and Katakana mastery."),
        ("毎日の挨拶", "Daily greetings and basic phrases."),
        ("助詞の基本", "Particles は が を に で."),
        ("旅行日本語", "Travel vocabulary in Japan."),
        ("敬語入門", "Introduction to keigo (polite speech)."),
        ("漢字 100", "First 100 essential kanji."),
        ("会話と文化", "Conversation and Japanese culture."),
        ("JLPT N5 Mock", "Mock JLPT N5 examination."),
    ],
    "ko": [
        ("한글 마스터", "Hangul reading and writing."),
        ("기본 인사", "Greetings and self-introduction."),
        ("조사 기초", "Particles 은/는 이/가 을/를."),
        ("한국 여행", "Travel vocabulary in Korea."),
        ("높임말 입문", "Honorifics introduction."),
        ("한자어 100", "100 essential Sino-Korean words."),
        ("대화와 문화", "Conversation and Korean culture."),
        ("TOPIK I Mock", "Mock TOPIK level I exam."),
    ],
}


FEATURES_TEMPLATE = [
    ("Sparkles", "Авторская методика FLæʃcom", "Коммуникативный подход — говорите с первого урока, без зазубривания правил."),
    ("Award", "Cambridge English Centre", "Официальный статус Cambridge English. Преподаватели сертифицированы CELTA / DELTA."),
    ("Users", "Группы до 8 человек", "Маленькие группы — больше речевой практики каждому студенту."),
    ("Calendar", "Гибкое расписание", "2 урока в неделю. Утром, днём или вечером — выберите удобное время."),
    ("Headphones", "Аудио и видео материалы", "Подкасты, фильмы, музыка — погружение в живой язык."),
    ("BadgeCheck", "Сертификат YES Center", "По окончании курса — сертификат с указанием уровня CEFR."),
]


REVIEW_BANK = [
    ("Анна Морозова", 5, "Я начала с нуля и за полгода вышла на B1. Преподаватель Мария — просто чудо, всегда чувствую поддержку и не боюсь ошибаться."),
    ("Дмитрий Соколов", 5, "Работаю в IT, нужно было подтянуть английский для общения с командой. После 4 месяцев чувствую себя свободно на созвонах с зарубежными коллегами."),
    ("Елена Новикова", 4, "Очень нравится коммуникативный подход. Чуть-чуть бы больше домашек — иногда хочется потренироваться сверх программы."),
    ("Виктор Иванов", 5, "После трёх курсов в YES сдал FCE на B2 с первого раза. Огромное спасибо команде!"),
    ("Мария Петрова", 5, "Дочка ходит в YES уже второй год. Видно, как растёт её уверенность в речи. Преподаватели находят подход к каждому ребёнку."),
    ("Сергей Кузнецов", 4, "Хорошая программа, понятная структура. Хочется больше живой практики с носителями — но в целом результат меня радует."),
    ("Татьяна Зайцева", 5, "Перешла из другой школы — небо и земля. Здесь действительно учат говорить, а не зубрить таблицы."),
    ("Игорь Михайлов", 5, "Учусь онлайн из Краснодара. Качество не уступает офлайн-формату — методика и подача топ."),
    ("Ольга Смирнова", 5, "Готовилась к поступлению в магистратуру за рубежом. IELTS 7.5 — спасибо команде YES!"),
    ("Алексей Волков", 4, "Курс грамматики помог наконец-то разобраться с временами. Преподаватель объясняет очень доходчиво."),
]


async def seed_course_content() -> None:
    random.seed(7)
    async with SessionLocal() as db:
        courses_res = await db.execute(select(Course))
        courses = list(courses_res.scalars().all())
        if not courses:
            logger.warning("no_courses_to_enrich")
            return

        for course in courses:
            modules_count = (
                await db.execute(
                    select(func.count())
                    .select_from(CourseModule)
                    .where(CourseModule.course_id == course.id)
                )
            ).scalar_one()

            if modules_count > 0:
                logger.info("modules_already_exist", course=course.title)
            else:
                tpl = CURRICULA.get(
                    course.language.value, CURRICULA["en"]
                )
                for idx, (title, summary) in enumerate(tpl, start=1):
                    db.add(
                        CourseModule(
                            course_id=course.id,
                            order_index=idx,
                            title=title,
                            summary=summary,
                            lessons_count=4,
                        )
                    )

            features_count = (
                await db.execute(
                    select(func.count())
                    .select_from(CourseFeature)
                    .where(CourseFeature.course_id == course.id)
                )
            ).scalar_one()
            if features_count == 0:
                for idx, (icon, title, descr) in enumerate(FEATURES_TEMPLATE, start=1):
                    db.add(
                        CourseFeature(
                            course_id=course.id,
                            icon=icon,
                            title=title,
                            description=descr,
                            order_index=idx,
                        )
                    )

            reviews_count = (
                await db.execute(
                    select(func.count())
                    .select_from(CourseReview)
                    .where(CourseReview.course_id == course.id)
                )
            ).scalar_one()
            if reviews_count == 0:
                picks = random.sample(REVIEW_BANK, k=random.randint(3, 5))
                for name, rating, body in picks:
                    db.add(
                        CourseReview(
                            course_id=course.id,
                            author_name=name,
                            rating=rating,
                            body=body,
                            is_published=True,
                        )
                    )

        await db.commit()
        logger.warning("course_content_seeded", n_courses=len(courses))


def main() -> None:
    asyncio.run(seed_course_content())


if __name__ == "__main__":
    main()
