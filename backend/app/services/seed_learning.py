"""Seeds rich content_md for lesson_instance + demo enrollment requests.

Idempotent. Run after main + content seed:
    uv run python -m app.services.seed_learning
"""
from __future__ import annotations

import asyncio
import random

import structlog
from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.models.course import Course
from app.models.enrollment_request import EnrollmentRequest, EnrollmentRequestStatus
from app.models.group import Enrollment, Group
from app.models.lesson import LessonInstance
from app.models.user import User, UserRole, UserRoleAssignment

logger = structlog.get_logger(__name__)

EN_B1_LESSON_BODIES: list[tuple[str, str, str]] = [
    (
        "Welcome & Diagnostic",
        "Знакомство с группой, диагностический тест, постановка целей.",
        """## Цели урока
- Познакомиться с группой и преподавателем.
- Пройти диагностический тест Cambridge B1.
- Сформулировать личные цели на курс.

## Ход урока
**1. Warm-up · 5 мин**
Каждый студент представляется на английском: имя, профессия, причина учить язык.

**2. Diagnostic test · 30 мин**
Тест из 30 вопросов: grammar (16), vocabulary (10), reading comprehension (4).

**3. Speaking pair-work · 15 мин**
В парах: «Что я хочу уметь делать на английском через 4 месяца».

**4. Goals worksheet · 10 мин**
Каждый записывает 3 SMART-цели в дневник курса.

## Домашнее задание
Заполнить анкету «My English Story» — 200 слов о своём опыте изучения языка.""",
    ),
    (
        "Present Tenses Refresh",
        "Систематизация Present Simple, Continuous, Perfect, Perfect Continuous.",
        """## Цели урока
- Различать 4 вида настоящего времени.
- Использовать их в живой речи без запинок.

## Грамматика
**Present Simple** — рутина, факты, расписание.
> *I work in IT. The train leaves at 7.*

**Present Continuous** — действие сейчас, временная ситуация.
> *I'm working from home this week.*

**Present Perfect** — связь прошлого с настоящим, опыт.
> *I've lived in Moscow for 10 years.*

**Present Perfect Continuous** — продолжающееся действие с акцентом на длительность.
> *I've been studying English for two hours.*

## Practice
1. Open the brackets: *Anna ___ (work) for Google since 2020.*
2. Choose: *Right now I (read / am reading) a book.*
3. Translate: «Я уже три года изучаю немецкий».

## Speaking
В парах: «What have you been doing this week?»

## Домашнее задание
Workbook §2.1–2.4 + текст «A day in my life» (150 слов, минимум 5 разных времён).""",
    ),
    (
        "Past Simple vs Present Perfect",
        "Тонкая разница между прошедшим и опытом.",
        """## Ключевая идея
Past Simple — *когда* произошло (с маркерами времени).
Present Perfect — *что произошло* (важен результат, не время).

| Past Simple | Present Perfect |
|---|---|
| *I went to Paris last year.* | *I've been to Paris.* |
| *She finished it yesterday.* | *She has finished it.* |

## Маркеры
- **Past Simple**: yesterday, last week, ago, in 2020, when I was a child.
- **Present Perfect**: ever, never, just, already, yet, this week, since, for.

## Listening
Подкаст BBC Learning English «6 Minute English: Travel» — задание Match the speaker to the country.

## Speaking · ролевая игра
Travel agency: один студент — менеджер, другой — клиент. Customer says where they have been (Present Perfect) и where they went last year (Past Simple).

## Домашнее задание
Написать рассказ «My most memorable trip» — 200 слов, минимум 5 Past Simple и 3 Present Perfect.""",
    ),
    (
        "Past Continuous & Past Perfect",
        "Создаём слои в прошлом: фон, прерывание, последовательность.",
        """## Сценарии

**Past Continuous** — фон или длинное действие.
> *I was reading when she called.*

**Past Perfect** — действие до другого действия в прошлом.
> *When we arrived, the film had already started.*

## Storytelling pattern
1. Set the scene · Past Continuous: *It was raining and the wind was howling.*
2. Main events · Past Simple: *Suddenly, a stranger knocked on the door.*
3. Background causes · Past Perfect: *He had walked for hours without an umbrella.*

## Reading + tasks
Текст «The Stranger at the Door» (350 слов). Подчеркнуть все формы прошлого, объяснить выбор времени.

## Домашнее задание
Дописать концовку рассказа (150 слов), используя все 3 формы прошлого.""",
    ),
    (
        "Travel & Booking",
        "Лексика и фразы для путешествий — аэропорт, отель, ресторан.",
        """## Vocabulary
- **Airport**: boarding pass, baggage claim, layover, jet lag, customs, gate.
- **Hotel**: check-in, suite, room service, complimentary, vacancy.
- **Restaurant**: reservation, server, recommend, well-done, on the house.

## Functional language
- Booking a hotel: *I'd like to book a double room from the 5th to the 7th.*
- Asking for a recommendation: *What would you recommend?*
- Polite request: *Could I have the bill, please?*

## Listening
Аудио «Checking in at the Marriott» — заполните форму регистрации.

## Speaking · role-play
- A: турист в аэропорту, потерял багаж.
- B: сотрудник авиакомпании.

## Домашнее задание
Quizlet-сет «Travel B1» (60 слов) + написать email-бронь отеля.""",
    ),
    (
        "Cultural Etiquette Across Cultures",
        "Cross-cultural communication: что считается вежливым в Британии, США, Японии.",
        """## Discussion warm-up
- В каких странах вы были? Какие культурные шок-моменты помните?

## Reading: «Cultural blunders that almost ended my career»
Текст 500 слов о трёх случаях неловкости. Студенты обсуждают:
- Что было не так?
- Как бы вы поступили?

## Vocabulary
formal · casual · polite · rude · taboo · faux pas · nuance · intercultural.

## Speaking · debate
"Casual office culture is more productive than formal one." Группа делится на pro / contra.

## Домашнее задание
Watch a TED talk «How culture drives behaviours» (12 мин) — подготовить summary 150 слов.""",
    ),
    (
        "CV & Cover Letter Writing",
        "Структура CV, action verbs, tone, distinctive cover letter.",
        """## CV essentials
1. Contact block · Photo (Russia/EU yes; US no).
2. Summary statement · 2-3 предложения, цепляет.
3. Experience · обратная хронология, action verbs (led, designed, optimized).
4. Education.
5. Skills · разделить на hard / soft.

## Cover letter formula
- Hook · why this company.
- Match · 2-3 ключевые квалификации.
- Story · конкретный кейс.
- Close · clear ask.

## Practice
Каждый студент приносит свою англоязычную CV (черновик). Парная критика по чек-листу.

## Домашнее задание
Финальная версия CV + cover letter под 1 конкретную вакансию (LinkedIn). Загрузить в кабинет.""",
    ),
    (
        "Job Interview Practice",
        "STAR-метод, behavioural questions, salary negotiation.",
        """## Reading · «How to crush a behavioural interview»
- STAR: Situation · Task · Action · Result.
- 3 типичных вопроса: Tell me about yourself / A challenge / A failure.

## Listening · mock interview
Аудио на 10 минут: senior engineer answers «Tell me about a time you led a project».

## Speaking · pair mock interview
A — recruiter, B — candidate. Поменялись через 10 мин.

## Salary talk
- *The market range for this role is 4-6K. Where would you be?*
- *I'm flexible, but I'd like to be in the upper half of the range.*

## Домашнее задание
Записать видео-самопрезентацию (1 минута) на английском. Загрузить файл в платформу.""",
    ),
    (
        "Modal Verbs Workshop",
        "Can / could / may / might / must / should / have to — оттенки смысла.",
        """## Quick reference
| Modal | Meaning | Example |
|---|---|---|
| **can** | способность, разрешение | *She can swim.* |
| **could** | прошлое способности, вежливый запрос | *Could you help?* |
| **may / might** | вероятность | *It might rain.* |
| **must** | обязанность, уверенность | *You must be tired.* |
| **should** | совет | *You should rest.* |
| **have to** | внешняя необходимость | *I have to leave.* |

## Practice
Перепишите без модальных: *You should see a doctor.* → *It's a good idea to see a doctor.*

## Speaking · advice column
Each student brings a fictional letter «Dear Mary…». Other students give advice using *should*, *could*, *might*.

## Домашнее задание
Workbook §6.1–6.4 + write 5 sentences using each modal at least once.""",
    ),
    (
        "Conditionals: 0, 1, 2, 3",
        "Реальное / возможное / нереальное / упущенное.",
        """## Все 4 типа

**Type 0** — universal truth: *If you heat water to 100°C, it boils.*
**Type 1** — real future: *If it rains, I'll stay home.*
**Type 2** — hypothetical present: *If I had a car, I would drive.*
**Type 3** — past regret: *If I had studied more, I would have passed.*

## Mixed conditionals (B2 preview)
*If she had taken the offer, she would be in London now.* (3rd in if-clause + 2nd in main).

## Speaking · «What if?»
Group questions: *What would you do if you won the lottery? What would you have done if you'd been born 100 years ago?*

## Домашнее задание
Эссе «If I could change one thing about my life» — 250 слов. Минимум 3 conditional types.""",
    ),
    (
        "Reported Speech",
        "Передача чужих слов: tense shift, pronoun shift, time references.",
        """## Tense shift
- Present Simple → Past Simple
- Present Continuous → Past Continuous
- Present Perfect → Past Perfect
- Past Simple → Past Perfect
- will → would
- can → could

## Time/place
- now → then
- today → that day
- tomorrow → the next day
- here → there

## Speaking
Парная игра: один говорит факт о себе, другой пересказывает в reported speech.

## Reading
Газетная статья — 5 цитат. Переписать каждую в reported speech.

## Домашнее задание
Workbook §8.1 + summary прослушанного подкаста (200 слов, как минимум 5 reported speech).""",
    ),
    (
        "Phrasal Verbs Marathon",
        "Самые частые phrasal verbs B1: get, look, take, put, come.",
        """## Top 30 для B1
- **get**: get up, get over, get along, get rid of, get back, get into.
- **look**: look up, look after, look for, look forward to.
- **take**: take off, take up, take after, take over.
- **put**: put on, put off, put up with, put through.
- **come**: come up with, come across, come down with, come back.

## Practice · stories
Each student receives a card with 5 phrasal verbs. Tell a 1-minute story using all 5.

## Listening
Comedy podcast «Phrasal verbs in real conversations» (BBC).

## Домашнее задание
Quizlet-set «Phrasal Verbs B1 · 30 cards» + 10 contextual sentences.""",
    ),
    (
        "Opinion & Argumentation",
        "Как аргументировать позицию, признавать слабые места, контр-аргументы.",
        """## Linking phrases
- **Stating opinion**: In my view, To my mind, From my perspective.
- **Adding examples**: For instance, To illustrate, Take X as an example.
- **Contrasting**: However, On the other hand, Nevertheless.
- **Conceding**: Admittedly, While it's true that…
- **Concluding**: All in all, To sum up.

## Reading
Editorial «Should social media be regulated?» — найти все linking phrases.

## Debate
2 команды, тема «Remote work is here to stay». Каждой команде даётся 5 минут на подготовку.

## Домашнее задание
Эссе 250 слов с opinion + counter-argument: «Is the rise of AI good for education?»""",
    ),
    (
        "Listening Strategies",
        "Слушаем неподготовленную речь — ускоренные носители, акценты.",
        """## Strategies
- **Predict** content from title.
- **Skim** for gist on first listen.
- **Scan** for details on second.
- **Don't panic** if you miss a word — keep going.

## Practice
3 audio clips различных акцентов: British (BBC), American (NPR), Australian (ABC). Compare comprehension.

## Speaking · summary chains
Один студент пересказывает аудио следующему (как «испорченный телефон»). Last student tells what they understood — compare with original.

## Домашнее задание
TED talk on choice (Barry Schwartz, 19 min) — write a 200-word summary.""",
    ),
    (
        "Reading Strategies",
        "Активное чтение, аннотирование, vocabulary in context.",
        """## Active reading
- Highlight unknown words.
- Underline main ideas.
- Margin notes: ✓ understand, ? confused, ! surprised.

## Vocabulary in context
Don't run to the dictionary. Try to guess from:
- Word root (e.g., *mal* = bad).
- Surrounding context.
- Position in sentence.

## Reading session
Article from The Economist (700 words). Time-limited 8 minutes. Then comprehension Qs.

## Домашнее задание
Read a chapter from «Animal Farm» (graded reader B1) + journal: 5 new words in context.""",
    ),
    (
        "Mid-course Review & Assessment",
        "Контрольная работа по первой половине курса.",
        """## Структура контрольной (90 мин)

**Use of English** — 25 мин, 30 вопросов.
**Reading comprehension** — 20 мин, 1 текст + 8 вопросов.
**Listening** — 20 мин, 2 аудио + 10 вопросов.
**Writing** — 25 мин, эссе 200 слов.

## Critère de réussite
- 70%+ → continue to module 5
- 50–69% → отдельная консультация с преподавателем
- <50% → пройти ревью предыдущих модулей

## Домашнее задание
Reflection journal: «What I learned, what I struggled with, my plan for the second half» — 250 слов.""",
    ),
]

# Modules 5-8 lesson bodies (lighter — 8 more)
EN_B1_EXTRA: list[tuple[str, str, str]] = [
    ("Storytelling: Narrative Tenses", "Все формы прошлого + descriptive adjectives.",
     "## Цели урока\n- Овладеть 4 формами прошлого в одной истории.\n- Расширить descriptive adjective bank.\n\n## Practice\nКаждый студент рассказывает story «An unforgettable day» (1.5 мин). Слушатели подсчитывают, сколько разных форм прошлого использовано.\n\n## Домашнее задание\nWrite a 300-word short story for the platform's «Storytelling Battle»."),
    ("Describing People & Places", "Adjective order, comparative/superlative, vivid imagery.",
     "## Adjective order\nopinion → size → age → shape → colour → origin → material → purpose.\n*A beautiful small antique round wooden Italian dining table.*\n\n## Practice\nPick a photo from Unsplash. Описать в 100 словах.\n\n## Домашнее задание\nДва описания: места (200 слов) и человека (150 слов) для блог-поста."),
    ("Negotiation & Persuasion", "Soft language for compromise, win-win patterns.",
     "## Phrases\n- Could we possibly…?\n- Would you consider…?\n- I see your point, however…\n- Let's find a middle ground.\n\n## Role-play\nNegotiate salary, project deadline, vacation policy in pairs.\n\n## Домашнее задание\nWrite a polite negotiation email to a vendor — 150 words."),
    ("Email Etiquette: Pro Edition", "Subject lines, openings, sign-offs, tone.",
     "## Anatomy of a great email\n1. Clear subject (max 8 words).\n2. Greeting calibrated to relationship.\n3. Single ask in opening sentence.\n4. Bullet structure if multi-point.\n5. Sign-off matching opening.\n\n## Tone calibration\nFormal: Dear Ms. Ivanova. Neutral: Hi Anna. Friendly: Hey Anna!\n\n## Домашнее задание\nПереписать 3 неудачных email из «inbox cleanup» worksheet."),
    ("Public Speaking 101", "Структура, голос, eye contact, борьба с волнением.",
     "## Frameworks\n- PREP: Point — Reason — Example — Point.\n- Three-act: setup → conflict → resolution.\n\n## Pulse exercise\n2-min impromptu speech. Topic вытягивают из шляпы.\n\n## Домашнее задание\nЗаписать 2-min speech на тему по выбору, загрузить в платформу. Получите фидбек преподавателя через 48ч."),
    ("Reading Long-Form Texts", "Strategies for novels, longer journalism.",
     "## Tactics\n- Read in sprints of 25 min.\n- Annotate every 2-3 pages.\n- Summarise the chapter in 3 bullets.\n\n## Домашнее задание\nDive into «Of Mice and Men» (Steinbeck, simplified B1 edition) — finish chapters 1-2."),
    ("Final Speaking Mock · Cambridge B1", "Пробный устный экзамен в формате Cambridge B1.",
     "## Структура\n1. Interview part (2 min) — about you.\n2. Long turn (1 min each + 30s response).\n3. Collaborative task (3 min).\n4. Discussion (3 min).\n\n## Cтудент знакомится с критериями\nGrammar, vocabulary, discourse, pronunciation, interactive communication.\n\n## Домашнее задание\nReflection: «3 things I improved most this course»."),
    ("Final Cambridge Mock Exam", "Полный mock-экзамен под таймером.",
     "## Структура (3 ч 15 мин)\n- Reading & Use of English: 1 ч 15 мин\n- Writing: 1 ч 20 мин\n- Listening: 35 мин\n- Speaking: 14 мин (отдельный день)\n\n## Что после\nСудья выставляет CEFR-оценку (A2 → C1). Письменный фидбек в течение 5 рабочих дней.\n\n## Поздравляем!\nВы прошли курс English B1. Скачайте сертификат YES Center в личном кабинете."),
]


async def seed_lesson_content() -> None:
    """Fill content_md and summary for English B1 adults course lessons."""
    bodies = EN_B1_LESSON_BODIES + EN_B1_EXTRA  # 24 templates
    async with SessionLocal() as db:
        course_res = await db.execute(
            select(Course).where(Course.title == "Английский для взрослых · B1")
        )
        course = course_res.scalar_one_or_none()
        if course is None:
            logger.warning("course_not_found", target="EN B1 adults")
            return

        groups_res = await db.execute(select(Group).where(Group.course_id == course.id))
        groups = list(groups_res.scalars().all())
        if not groups:
            return

        filled = 0
        for group in groups:
            lessons_res = await db.execute(
                select(LessonInstance)
                .where(LessonInstance.group_id == group.id)
                .order_by(LessonInstance.sequence)
            )
            lessons = list(lessons_res.scalars().all())
            for lesson in lessons:
                if lesson.content_md:
                    continue
                idx = (lesson.sequence - 1) % len(bodies)
                title, summary, body = bodies[idx]
                lesson.title = f"Lesson {lesson.sequence}: {title}"
                lesson.summary = summary
                lesson.content_md = body
                filled += 1

        await db.commit()
        logger.warning("lesson_content_filled", lessons=filled)


async def seed_demo_requests() -> None:
    """Add 5 demo enrollment requests with mixed statuses + 2 fresh pending."""
    random.seed(99)
    async with SessionLocal() as db:
        existing_count = (
            await db.execute(select(func.count()).select_from(EnrollmentRequest))
        ).scalar_one()
        if existing_count > 0:
            logger.info("requests_already_exist", count=existing_count)
            return

        # Pick users with student role
        student_ids_res = await db.execute(
            select(UserRoleAssignment.user_id).where(
                UserRoleAssignment.role == UserRole.student,
                UserRoleAssignment.revoked_at.is_(None),
            )
        )
        student_ids = [row[0] for row in student_ids_res.all()]
        if not student_ids:
            return

        groups_res = await db.execute(select(Group).limit(20))
        groups = list(groups_res.scalars().all())
        if not groups:
            return

        admin_res = await db.execute(
            select(User).where(User.is_superuser.is_(True)).limit(1)
        )
        admin = admin_res.scalar_one_or_none()

        from datetime import UTC, datetime, timedelta

        # 3 pending, 2 approved (with real enrollment), 1 rejected
        statuses = [
            (EnrollmentRequestStatus.pending, None),
            (EnrollmentRequestStatus.pending, None),
            (EnrollmentRequestStatus.pending, None),
            (EnrollmentRequestStatus.approved, "Подходит уровень и время. Добро пожаловать!"),
            (EnrollmentRequestStatus.approved, "Группа подходит, согласовано с методистом."),
            (EnrollmentRequestStatus.rejected, "Извините, группа набрана. Предложим следующий поток."),
        ]
        notes = [
            "Хочу подтянуть язык до уровня B2 для работы.",
            "Готовлюсь к переезду — нужен интенсив.",
            "Дочка идёт в 5 класс, хочется хорошую базу.",
            "Несколько лет учил, теперь хочу систематизировать.",
            "Друзья посоветовали YES — впечатлили отзывы.",
            "Удобно расписание, готов начать сразу.",
        ]

        used: set[tuple] = set()
        for st, reason in statuses:
            for _ in range(20):
                sid = random.choice(student_ids)
                gid = random.choice(groups).id
                key = (sid, gid)
                if key in used:
                    continue
                # Skip if already enrolled
                already = await db.execute(
                    select(Enrollment).where(
                        Enrollment.student_id == sid,
                        Enrollment.group_id == gid,
                        Enrollment.left_at.is_(None),
                    )
                )
                if already.scalar_one_or_none():
                    continue
                used.add(key)
                req = EnrollmentRequest(
                    student_id=sid,
                    group_id=gid,
                    status=st,
                    note=random.choice(notes),
                    decision_reason=reason,
                    processed_by=admin.id if (st != EnrollmentRequestStatus.pending and admin) else None,
                    processed_at=(
                        datetime.now(UTC) - timedelta(days=random.randint(0, 5))
                        if st != EnrollmentRequestStatus.pending
                        else None
                    ),
                )
                db.add(req)

                if st == EnrollmentRequestStatus.approved:
                    db.add(
                        Enrollment(
                            student_id=sid,
                            group_id=gid,
                            enrolled_at=datetime.now(UTC) - timedelta(days=random.randint(0, 5)),
                        )
                    )
                break

        await db.commit()
        logger.warning("demo_requests_seeded")


async def main_async() -> None:
    await seed_lesson_content()
    await seed_demo_requests()


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
