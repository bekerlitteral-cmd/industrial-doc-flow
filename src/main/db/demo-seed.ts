import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

/**
 * Demo seed — populates the database with a realistic "lived-in" dataset
 * for a fictional machining plant (ОАО «Промметалл»). Runs once per major
 * version, tracked via the SQLite `user_version` PRAGMA.
 *
 * Current target version: 2.
 */
const DEMO_VERSION = 2

type RoleStr = 'employee' | 'manager' | 'admin'

interface DemoUser {
  username: string
  password: string
  full_name: string
  role: RoleStr
  department: string
  position: string
}

const EXTRA_USERS: DemoUser[] = [
  { username: 'prod_dir', password: 'prod123', full_name: 'Соколов Дмитрий Викторович', role: 'manager', department: 'Производство', position: 'Директор по производству' },
  { username: 'ch1', password: 'ch1pass', full_name: 'Волков Виктор Геннадьевич', role: 'manager', department: 'Цех №1 (литейный)', position: 'Начальник цеха' },
  { username: 'ch3', password: 'ch3pass', full_name: 'Лебедев Сергей Александрович', role: 'manager', department: 'Цех №3 (сборочный)', position: 'Начальник цеха' },
  { username: 'ch4', password: 'ch4pass', full_name: 'Орлов Андрей Николаевич', role: 'manager', department: 'Цех №4 (термический)', position: 'Начальник цеха' },
  { username: 'otk', password: 'otk123', full_name: 'Михайлова Екатерина Степановна', role: 'manager', department: 'ОТК', position: 'Начальник ОТК' },
  { username: 'ogm', password: 'ogm123', full_name: 'Григорьев Олег Павлович', role: 'manager', department: 'ОГМ', position: 'Главный механик' },
  { username: 'hr', password: 'hr123', full_name: 'Соловьёва Татьяна Юрьевна', role: 'manager', department: 'Отдел кадров', position: 'Начальник отдела кадров' },
  { username: 'buh', password: 'buh123', full_name: 'Зайцева Марина Игоревна', role: 'manager', department: 'Бухгалтерия', position: 'Главный бухгалтер' },
  { username: 'novikov', password: 'pass123', full_name: 'Новиков Артём Васильевич', role: 'employee', department: 'Цех №2 (механический)', position: 'Слесарь-ремонтник 5 разряда' },
  { username: 'fedorov', password: 'pass123', full_name: 'Фёдоров Илья Дмитриевич', role: 'employee', department: 'Цех №2 (механический)', position: 'Токарь 4 разряда' },
  { username: 'alekseev', password: 'pass123', full_name: 'Алексеев Роман Сергеевич', role: 'employee', department: 'Цех №3 (сборочный)', position: 'Слесарь-сборщик 4 разряда' },
  { username: 'belyaeva', password: 'pass123', full_name: 'Беляева Ольга Николаевна', role: 'employee', department: 'Цех №1 (литейный)', position: 'Литейщик 3 разряда' },
  { username: 'semenov', password: 'pass123', full_name: 'Семёнов Михаил Юрьевич', role: 'employee', department: 'Цех №3 (сборочный)', position: 'Инженер-конструктор' },
  { username: 'bogdanova', password: 'pass123', full_name: 'Богданова Светлана Олеговна', role: 'employee', department: 'ОТК', position: 'Контролёр ОТК' },
  { username: 'tikhonov', password: 'pass123', full_name: 'Тихонов Денис Анатольевич', role: 'employee', department: 'Склад', position: 'Кладовщик' },
]

const JOB_APP_TEMPLATE = {
  code: 'JOB_APP',
  title: 'Заявка на приём на работу',
  description: 'Заявление кандидата о приёме на работу с указанием должности и условий',
  fields: [
    { key: 'candidate_name', label: 'ФИО кандидата', type: 'text', required: true },
    { key: 'birth_date', label: 'Дата рождения', type: 'date', required: true },
    { key: 'phone', label: 'Контактный телефон', type: 'text', required: true },
    { key: 'desired_position', label: 'Желаемая должность', type: 'text', required: true },
    { key: 'desired_department', label: 'Желаемое подразделение', type: 'text', required: false },
    { key: 'experience_years', label: 'Опыт работы (лет)', type: 'number', required: true },
    { key: 'last_employer', label: 'Последнее место работы', type: 'text', required: false },
    { key: 'education', label: 'Образование (где, что, год)', type: 'textarea', required: true },
    { key: 'desired_salary', label: 'Желаемая заработная плата, руб.', type: 'number', required: false },
    { key: 'start_date', label: 'Готов приступить с', type: 'date', required: true },
  ],
  body: `ЗАЯВЛЕНИЕ О ПРИЁМЕ НА РАБОТУ\n№ {{number}}                от {{created_date}}\n\nКандидат: {{candidate_name}}\nДата рождения: {{birth_date}}\nТелефон: {{phone}}\n\nЖелаемая должность: {{desired_position}}\nПодразделение: {{desired_department}}\nОпыт работы: {{experience_years}} лет\nПоследнее место работы: {{last_employer}}\n\nОбразование:\n{{education}}\n\nЖелаемая заработная плата: {{desired_salary}} руб.\nГотов приступить с: {{start_date}}\n\nЗаявку зарегистрировал: {{author_position}} {{author_name}}`,
}

interface DemoDoc {
  template: string
  title: string
  data: Record<string, string | number>
  author: string
  approvers: string[]
  /** ISO timestamp offset in days (negative = past) */
  daysAgo: number
  status: 'draft' | 'on_review' | 'approved' | 'rejected' | 'executed' | 'archived'
  /** comments per approver in order; null = pending */
  comments?: (string | null)[]
  /** for rejected, which step rejected (1-based) */
  rejectedAt?: number
}

const DEMO_DOCS: DemoDoc[] = [
  // ===== REQ_MAT — заявки на материалы (15) =====
  { template: 'REQ_MAT', title: 'Подшипники 6204-2RS для станка ЧПУ-3', data: { material_name: 'Подшипник радиальный 6204-2RS', quantity: 20, unit: 'шт', purpose: 'Плановая замена в шпиндельных узлах токарных станков 16К20 и 1К62. Износ выявлен при ТО.', need_date: '2026-12-20' }, author: 'employee', approvers: ['director', 'manager'], daysAgo: 120, status: 'executed', comments: ['Согласовано. Разрешаю выдачу со склада.', 'Утверждено. Контроль за списанием — кладовщик.'] },
  { template: 'REQ_MAT', title: 'Сверло спиральное Ø10 мм Р6М5', data: { material_name: 'Сверло спиральное Ø10 мм Р6М5 ГОСТ 10902-77', quantity: 50, unit: 'шт', purpose: 'Расходный инструмент для серийного производства корпусов изделия 12.405', need_date: '2026-12-15' }, author: 'fedorov', approvers: ['manager', 'prod_dir'], daysAgo: 115, status: 'executed', comments: ['Согласовано.', 'Утверждено.'] },
  { template: 'REQ_MAT', title: 'Электроды МР-3 Ø4 мм', data: { material_name: 'Электроды сварочные МР-3 Ø4 мм', quantity: 5, unit: 'упак', purpose: 'Сварочные работы в цехе №3 при сборке металлоконструкций', need_date: '2026-12-10' }, author: 'alekseev', approvers: ['ch3', 'manager'], daysAgo: 110, status: 'executed', comments: ['Подтверждаю необходимость.', 'Согласовано.'] },
  { template: 'REQ_MAT', title: 'Резцы проходные Т15К6', data: { material_name: 'Резец проходной отогнутый Т15К6 25х16', quantity: 10, unit: 'шт', purpose: 'Замена изношенного инструмента на токарных станках', need_date: '2026-11-30' }, author: 'fedorov', approvers: ['manager'], daysAgo: 100, status: 'archived', comments: ['Согласовано.'] },
  { template: 'REQ_MAT', title: 'Масло индустриальное И-20А', data: { material_name: 'Масло индустриальное И-20А ГОСТ 20799-88', quantity: 100, unit: 'л', purpose: 'Долив в гидросистемы станков и редукторов конвейеров', need_date: '2026-12-05' }, author: 'novikov', approvers: ['ogm', 'manager'], daysAgo: 95, status: 'executed', comments: ['Подтверждаю расход.', 'Согласовано.'] },
  { template: 'REQ_MAT', title: 'СОЖ Castrol Hysol XBB', data: { material_name: 'СОЖ Castrol Hysol XBB концентрат', quantity: 50, unit: 'л', purpose: 'Заправка СОЖ-систем токарной группы', need_date: '2026-12-12' }, author: 'manager', approvers: ['prod_dir'], daysAgo: 85, status: 'approved', comments: ['Утверждено.'] },
  { template: 'REQ_MAT', title: 'Круги шлифовальные 250x32x40', data: { material_name: 'Круг шлифовальный 1 250x32x40 14А 40 СМ1', quantity: 8, unit: 'шт', purpose: 'Замена изношенных кругов на плоскошлифовальном станке 3Е711В', need_date: '2026-12-22' }, author: 'novikov', approvers: ['manager', 'ogm'], daysAgo: 30, status: 'on_review', comments: [null, null] },
  { template: 'REQ_MAT', title: 'Чугун ЛСтЧ-1', data: { material_name: 'Чугун в чушках ЛСтЧ-1', quantity: 500, unit: 'кг', purpose: 'Литьё корпусов редукторов по заказу 2026-Р-118', need_date: '2027-01-10' }, author: 'belyaeva', approvers: ['ch1', 'prod_dir'], daysAgo: 22, status: 'on_review', comments: ['Согласовано — потребность подтверждаю.', null] },
  { template: 'REQ_MAT', title: 'Перчатки нитриловые', data: { material_name: 'Перчатки рабочие нитриловые с покрытием', quantity: 100, unit: 'шт', purpose: 'СИЗ для работников цехов №2 и №3', need_date: '2026-12-25' }, author: 'storekeeper', approvers: ['director'], daysAgo: 60, status: 'executed', comments: ['Утверждено.'] },
  { template: 'REQ_MAT', title: 'Защитные очки', data: { material_name: 'Очки защитные открытые', quantity: 30, unit: 'шт', purpose: 'СИЗ для сварщиков и шлифовщиков', need_date: '2026-12-18' }, author: 'storekeeper', approvers: ['director'], daysAgo: 55, status: 'approved', comments: ['Утверждено.'] },
  { template: 'REQ_MAT', title: 'Метчики М8', data: { material_name: 'Метчик машинно-ручной М8х1.25 Р6М5', quantity: 25, unit: 'шт', purpose: 'Нарезание резьбы в корпусах изделий', need_date: '2027-01-05' }, author: 'fedorov', approvers: ['manager', 'prod_dir'], daysAgo: 12, status: 'on_review', comments: [null, null] },
  { template: 'REQ_MAT', title: 'Пневмопистолеты для продувки', data: { material_name: 'Пневмопистолет для продувки сжатым воздухом', quantity: 2, unit: 'шт', purpose: 'Уборка стружки на токарных станках', need_date: '2026-12-30' }, author: 'novikov', approvers: ['manager'], daysAgo: 8, status: 'rejected', comments: ['Отклонено: имеется аналогичный инструмент на складе. См. остатки по карточке 145-А.'], rejectedAt: 1 },
  { template: 'REQ_MAT', title: 'Ветошь хлопковая', data: { material_name: 'Ветошь хлопчатобумажная обтирочная', quantity: 50, unit: 'кг', purpose: 'Обтирочный материал для всех цехов', need_date: '2026-12-20' }, author: 'storekeeper', approvers: ['director'], daysAgo: 45, status: 'executed', comments: ['Утверждено.'] },
  { template: 'REQ_MAT', title: 'Краска ГФ-92ХС серая', data: { material_name: 'Эмаль ГФ-92ХС серая', quantity: 40, unit: 'кг', purpose: 'Покраска кожухов и щитов электрооборудования по графику ППР', need_date: '2027-01-15' }, author: 'novikov', approvers: ['ogm', 'manager'], daysAgo: 5, status: 'draft' },
  { template: 'REQ_MAT', title: 'Сталь 45 пруток Ø50', data: { material_name: 'Сталь 45 ГОСТ 1050-2013, пруток Ø50 мм', quantity: 200, unit: 'кг', purpose: 'Заготовки для серии валов В-12.220', need_date: '2027-01-12' }, author: 'fedorov', approvers: ['manager', 'prod_dir'], daysAgo: 3, status: 'draft' },

  // ===== REPAIR — заявки на ремонт (12) =====
  { template: 'REPAIR', title: 'Биение шпинделя токарного 16К20', data: { equipment: 'Токарно-винторезный станок 16К20', inv_number: '2014', location: 'Цех №2, участок токарной обработки', failure: 'Радиальное биение шпинделя превышает 0,05 мм. Появилось после длительной обработки сталей. Слышен характерный гул на оборотах свыше 800.', urgency: 'Срочный' }, author: 'novikov', approvers: ['manager', 'ogm'], daysAgo: 75, status: 'executed', comments: ['Подтверждаю. На станке простой производства.', 'Принято в работу. Замена подшипников шпиндельного узла.'] },
  { template: 'REPAIR', title: 'Гудит подача фрезерного 6Р12', data: { equipment: 'Фрезерный станок 6Р12', inv_number: '2089', location: 'Цех №2, участок фрезерной обработки', failure: 'Посторонний шум в коробке подач. При переключении скоростей наблюдается удар. Возможен износ шестерни.', urgency: 'Плановый' }, author: 'fedorov', approvers: ['manager', 'ogm'], daysAgo: 68, status: 'executed', comments: ['Согласовано.', 'Принято. Запланировано на следующее ППР.'] },
  { template: 'REPAIR', title: 'Не включается сверлильный 2Н135', data: { equipment: 'Сверлильный станок 2Н135', inv_number: '1567', location: 'Цех №3, сборочный участок', failure: 'При нажатии пусковой кнопки контактор срабатывает, но двигатель не вращается. Подозрение на обрыв обмотки или сгорел магнитный пускатель.', urgency: 'Аварийный' }, author: 'alekseev', approvers: ['ch3', 'ogm'], daysAgo: 50, status: 'executed', comments: ['Срочно! Без станка стоит сборка.', 'Замена пускателя ПМЛ-2100, проверка обмоток — норма.'] },
  { template: 'REPAIR', title: 'Затупились ножи гильотины Н3121', data: { equipment: 'Ножницы гильотинные Н3121', inv_number: '3001', location: 'Заготовительный участок', failure: 'При резе листа 4 мм образуются заусенцы более 1 мм. Требуется перешлифовка верхнего и нижнего ножа.', urgency: 'Плановый' }, author: 'belyaeva', approvers: ['ch1', 'ogm'], daysAgo: 40, status: 'approved', comments: ['Подтверждаю.', 'Утверждено. Передать в инструментальный цех.'] },
  { template: 'REPAIR', title: 'Не работает реверс мостового крана', data: { equipment: 'Кран мостовой Q=5т, пролёт 16,5м', inv_number: '501', location: 'Цех №1, литейный пролёт', failure: 'Не работает кнопка "Назад" механизма передвижения тележки. Кнопка "Вперёд" работает штатно. Подозрение на залипание контактов в пульте.', urgency: 'Срочный' }, author: 'ch1', approvers: ['ogm', 'prod_dir'], daysAgo: 25, status: 'executed', comments: ['Срочно — простой формовочного участка.', 'Принято в работу. Замена пульта.'] },
  { template: 'REPAIR', title: 'Утечка масла на прессе КД2122', data: { equipment: 'Пресс кривошипный КД2122', inv_number: '2310', location: 'Цех №3, штамповочный участок', failure: 'Подтёки масла из-под сальников гидроцилиндра. Уровень масла в баке снижается за смену на 1,5–2 литра.', urgency: 'Плановый' }, author: 'alekseev', approvers: ['ch3', 'ogm'], daysAgo: 18, status: 'on_review', comments: ['Подтверждаю — выявлено при осмотре.', null] },
  { template: 'REPAIR', title: 'Стук в шпинделе шлифовального 3Б722', data: { equipment: 'Плоскошлифовальный станок 3Б722', inv_number: '2244', location: 'Цех №2, шлифовальный участок', failure: 'При вращении шпинделя слышен металлический стук, усиливающийся при подаче. Возможен износ подшипников.', urgency: 'Срочный' }, author: 'novikov', approvers: ['manager', 'ogm'], daysAgo: 15, status: 'on_review', comments: ['Срочный ремонт — детали 12.405 идут с биением.', null] },
  { template: 'REPAIR', title: 'Падение давления компрессора ВП3-20/9', data: { equipment: 'Компрессор поршневой ВП3-20/9', inv_number: '401', location: 'Компрессорная станция', failure: 'Давление в ресивере не поднимается выше 5,5 атм (норматив 8,0 атм). Возможен износ клапанов.', urgency: 'Аварийный' }, author: 'novikov', approvers: ['ogm', 'prod_dir'], daysAgo: 10, status: 'approved', comments: ['Аварийно! Питается весь пневмоинструмент завода.', 'В работе. Заказана ремкомплект клапанов.'] },
  { template: 'REPAIR', title: 'Обрыв ленты конвейера в литейном', data: { equipment: 'Конвейер ленточный КЛП-650', inv_number: '301', location: 'Цех №1, формовочный участок', failure: 'Произошёл разрыв конвейерной ленты по продольному шву. Требуется вулканизация.', urgency: 'Аварийный' }, author: 'belyaeva', approvers: ['ch1', 'ogm'], daysAgo: 6, status: 'on_review', comments: ['Аварийная остановка участка.', null] },
  { template: 'REPAIR', title: 'Нестабильная дуга на ВДУ-506', data: { equipment: 'Выпрямитель сварочный ВДУ-506', inv_number: '2502', location: 'Цех №3, сварочный участок', failure: 'При сварке электродом Ø4 дуга нестабильная, шов с непроварами. Возможен износ выпрямительных диодов.', urgency: 'Плановый' }, author: 'alekseev', approvers: ['ch3', 'ogm'], daysAgo: 4, status: 'draft' },
  { template: 'REPAIR', title: 'Не держит температуру печь ШО-6.12', data: { equipment: 'Электропечь камерная ШО-6.12', inv_number: '405', location: 'Цех №4, термический участок', failure: 'Заданная температура 850°C достигается медленно, регулятор перестал держать заданное значение, отклонение ±30°C. Подозрение на обрыв спирали или износ термопары.', urgency: 'Срочный' }, author: 'ch4', approvers: ['ogm', 'prod_dir'], daysAgo: 35, status: 'executed', comments: ['Срочно — термообработка задерживается.', 'Принято. Замена термопары ТХА.'] },
  { template: 'REPAIR', title: 'Заедание тали кран-балки', data: { equipment: 'Кран-балка подвесная Q=3.2т', inv_number: '502', location: 'Склад готовой продукции', failure: 'Электрическая таль заедает при подъёме грузов более 1,5 т. Слышен щелчок в редукторе.', urgency: 'Плановый' }, author: 'tikhonov', approvers: ['storekeeper', 'ogm'], daysAgo: 28, status: 'rejected', comments: ['Подтверждаю — наблюдала сама.', 'Отклонено: в график ППР внесён ремонт всей кран-балки на январь, дублирующая заявка не нужна.'], rejectedAt: 2 },

  // ===== ACT — акты (10) =====
  { template: 'ACT', title: 'Приёмка стали 45 — 1500 кг', data: { act_type: 'Приёмки', subject: 'Партия стали 45 в прутках Ø50 — 1500 кг по накладной №А-2026-1145', commission: 'Председатель: Зайцева М.И., главный бухгалтер\nЧлены: Морозова Е.В., кладовщик; Богданова С.О., контролёр ОТК', findings: 'Партия осмотрена. Маркировка соответствует сертификату качества №СК-2026-887. Геометрия прутков в норме. Принять на ответственное хранение.' }, author: 'storekeeper', approvers: ['buh', 'otk'], daysAgo: 80, status: 'executed', comments: ['Согласовано.', 'ОТК подтверждает соответствие.'] },
  { template: 'ACT', title: 'Списание токарного станка 1К62 №2001', data: { act_type: 'Списания', subject: 'Станок токарно-винторезный 1К62, инв. №2001, 1987 г.в.', commission: 'Председатель: Григорьев О.П., главный механик\nЧлены: Сидорова А.С., нач. цеха №2; Зайцева М.И., главный бухгалтер', findings: 'Износ оборудования 92%. Капитальный ремонт нецелесообразен — превышает остаточную стоимость. Рекомендуется к списанию и сдаче в металлолом.' }, author: 'ogm', approvers: ['director', 'buh'], daysAgo: 90, status: 'executed', comments: ['Утверждено.', 'Принято к учёту.'] },
  { template: 'ACT', title: 'Брак — 8 валов В-12.220', data: { act_type: 'Брака', subject: 'Валы В-12.220 в количестве 8 шт., смена с 02.12.2026', commission: 'Председатель: Михайлова Е.С., нач. ОТК\nЧлены: Сидорова А.С., нач. цеха №2; Фёдоров И.Д., токарь', findings: 'Отклонение по диаметру шейки превышает поле допуска (Ø49,92 при норме Ø50-0,025/-0,05). Причина — биение шпинделя станка 16К20 (заявка на ремонт №REPAIR-2026-0001). Брак неисправимый. Списать.' }, author: 'otk', approvers: ['manager', 'prod_dir'], daysAgo: 70, status: 'approved', comments: ['Согласовано.', 'Утверждено. Виновные — отсутствуют (технический брак).'] },
  { template: 'ACT', title: 'Выполненных работ — ТО токарного 16К20', data: { act_type: 'Выполненных работ', subject: 'Техническое обслуживание токарно-винторезного станка 16К20, инв. №2014', commission: 'Председатель: Григорьев О.П., главный механик\nЧлены: Новиков А.В., слесарь-ремонтник; Сидорова А.С., нач. цеха №2', findings: 'Выполнены: замена подшипников шпинделя, регулировка зазоров, замена масла в коробке скоростей. Биение шпинделя приведено в норму (≤0,02 мм). Станок принят в эксплуатацию.' }, author: 'ogm', approvers: ['manager'], daysAgo: 65, status: 'executed', comments: ['Принято.'] },
  { template: 'ACT', title: 'Приёмка подшипников 6204-2RS', data: { act_type: 'Приёмки', subject: 'Партия подшипников 6204-2RS — 20 шт. по накладной №А-2026-1198', commission: 'Председатель: Морозова Е.В., кладовщик\nЧлены: Богданова С.О., контролёр ОТК; Новиков А.В., слесарь', findings: 'Подшипники осмотрены, упаковка целая. Партия соответствует ТУ. Принято на склад.' }, author: 'storekeeper', approvers: ['otk'], daysAgo: 110, status: 'archived', comments: ['Соответствует.'] },
  { template: 'ACT', title: 'Списание СОЖ отработанной', data: { act_type: 'Списания', subject: 'Отработанная СОЖ Castrol Hysol — 120 л', commission: 'Председатель: Сидорова А.С., нач. цеха №2\nЧлены: Новиков А.В.; Зайцева М.И., главный бухгалтер', findings: 'СОЖ отработана сверх нормативного срока службы (3 мес.), эмульсия расслаивается, появился запах. Подлежит утилизации спецорганизацией по договору №УТ-2026-04.' }, author: 'manager', approvers: ['buh', 'prod_dir'], daysAgo: 38, status: 'approved', comments: ['Согласовано.', 'Утверждено.'] },
  { template: 'ACT', title: 'Выполненных работ — ремонт 2Н135', data: { act_type: 'Выполненных работ', subject: 'Ремонт сверлильного станка 2Н135, инв. №1567', commission: 'Председатель: Григорьев О.П.\nЧлены: Лебедев С.А., нач. цеха №3; Новиков А.В.', findings: 'Заменён магнитный пускатель ПМЛ-2100. Проверены обмотки двигателя — норма. Станок запущен, работает штатно.' }, author: 'ogm', approvers: ['ch3'], daysAgo: 47, status: 'executed', comments: ['Принято.'] },
  { template: 'ACT', title: 'Брак — литьё корпусов', data: { act_type: 'Брака', subject: 'Литые корпуса крышек редуктора 12.808 — 5 шт., плавка №174', commission: 'Председатель: Михайлова Е.С.\nЧлены: Волков В.Г., нач. цеха №1; Беляева О.Н.', findings: 'Обнаружены раковины и неслитины на внутренней поверхности корпусов. Причина — несоблюдение режима заливки (преждевременная заливка металла с пониженной температурой). Брак неисправимый.' }, author: 'otk', approvers: ['ch1', 'prod_dir'], daysAgo: 42, status: 'approved', comments: ['Принято. Проведу разбор смены.', 'Утверждено.'] },
  { template: 'ACT', title: 'Приёмка инструмента (метчики, резцы)', data: { act_type: 'Приёмки', subject: 'Поставка инструмента: метчики М8 — 25 шт., резцы Т15К6 — 10 шт.', commission: 'Председатель: Морозова Е.В.\nЧлены: Богданова С.О.; Фёдоров И.Д.', findings: 'Партия комплектна, маркировка соответствует. Принято на склад на места хранения К-12 и К-14.' }, author: 'storekeeper', approvers: ['otk'], daysAgo: 33, status: 'archived', comments: ['Соответствует.'] },
  { template: 'ACT', title: 'Списание спецодежды (изношенной)', data: { act_type: 'Списания', subject: 'Спецодежда рабочих цеха №2 — куртки, брюки, ботинки', commission: 'Председатель: Соловьёва Т.Ю., нач. ОК\nЧлены: Зайцева М.И.; Сидорова А.С.', findings: 'Спецодежда отработала нормативный срок носки (12 мес.). Изношена, не подлежит ремонту. Списать. Работникам выдать новую согласно нормам выдачи СИЗ.' }, author: 'hr', approvers: ['buh', 'director'], daysAgo: 16, status: 'on_review', comments: ['Согласовано.', null] },

  // ===== ORDER — приказы (8) =====
  { template: 'ORDER', title: 'О премировании работников цеха №2', data: { order_subject: 'премировании работников цеха №2 по итогам ноября 2026 года', preamble: 'В соответствии с положением о премировании и в связи с выполнением месячного производственного плана цеха №2 на 112%', body: '1. Премировать работников цеха №2 в размере 25% от должностного оклада по списку (приложение №1).\n2. Бухгалтерии произвести начисление премии в декабрьской заработной плате.\n3. Начальнику отдела кадров обеспечить документальное оформление.', control: 'главного бухгалтера Зайцеву М.И.' }, author: 'director', approvers: ['buh'], daysAgo: 105, status: 'executed', comments: ['Согласовано.'] },
  { template: 'ORDER', title: 'О проведении инвентаризации ТМЦ', data: { order_subject: 'проведении инвентаризации товарно-материальных ценностей на складе', preamble: 'В целях обеспечения достоверности данных бухгалтерского учёта и выявления фактического наличия ТМЦ', body: '1. Провести инвентаризацию ТМЦ на центральном складе предприятия в период с 20 по 24 декабря 2026 г.\n2. Утвердить состав инвентаризационной комиссии: председатель — Зайцева М.И.; члены — Морозова Е.В., Тихонов Д.А., Богданова С.О.\n3. Приостановить операции по приёму и выдаче ТМЦ на период инвентаризации.', control: 'главного бухгалтера Зайцеву М.И.' }, author: 'director', approvers: ['buh'], daysAgo: 88, status: 'executed', comments: ['Принято к исполнению.'] },
  { template: 'ORDER', title: 'О приёме на работу Фёдорова И.Д.', data: { order_subject: 'приёме на работу Фёдорова И.Д.', preamble: 'На основании заявления Фёдорова Ильи Дмитриевича и результатов собеседования', body: '1. Принять Фёдорова Илью Дмитриевича на должность токаря 4 разряда в цех №2 (механический) с 15.10.2026.\n2. Установить должностной оклад согласно штатному расписанию.\n3. Заключить трудовой договор. Испытательный срок — 2 месяца.', control: 'начальника отдела кадров Соловьёву Т.Ю.' }, author: 'director', approvers: ['hr', 'buh'], daysAgo: 195, status: 'archived', comments: ['Документы оформлены.', 'Принят к учёту.'] },
  { template: 'ORDER', title: 'О переводе Алексеева Р.С.', data: { order_subject: 'переводе Алексеева Р.С. на должность бригадира', preamble: 'В целях улучшения организации производства и на основании представления начальника цеха №3', body: '1. Перевести Алексеева Романа Сергеевича с должности слесаря-сборщика 4 разряда на должность бригадира сборочного участка цеха №3 с 01.12.2026.\n2. Установить надбавку за бригадирство 15% к окладу.\n3. Внести соответствующие изменения в трудовой договор.', control: 'начальника отдела кадров Соловьёву Т.Ю.' }, author: 'ch3', approvers: ['director', 'hr'], daysAgo: 55, status: 'executed', comments: ['Согласовано.', 'Оформлено.'] },
  { template: 'ORDER', title: 'О дисциплинарном взыскании', data: { order_subject: 'применении дисциплинарного взыскания', preamble: 'По факту нарушения требований инструкции по охране труда работником цеха №1 Петровым С.К. (выход на участок без СИЗ), на основании докладной нач. цеха и объяснительной работника', body: '1. Объявить Петрову Сергею Кирилловичу замечание.\n2. Провести с работниками цеха №1 внеплановый инструктаж по охране труда.\n3. Включить факт нарушения в отчёт за декабрь.', control: 'начальника ОТК Михайлову Е.С.' }, author: 'ch1', approvers: ['director', 'hr'], daysAgo: 20, status: 'on_review', comments: ['Согласовано.', null] },
  { template: 'ORDER', title: 'О выходных в новогодние праздники', data: { order_subject: 'режиме работы предприятия в новогодние праздники 2027 года', preamble: 'В соответствии с производственным календарём на 2027 год', body: '1. Установить нерабочие дни с 01.01.2027 по 08.01.2027 включительно.\n2. 30.12.2026 — сокращённый рабочий день (на 1 час).\n3. Дежурным сотрудникам котельной, охраны и компрессорной — работать по утверждённому графику.', control: 'начальника отдела кадров Соловьёву Т.Ю.' }, author: 'director', approvers: ['hr'], daysAgo: 14, status: 'approved', comments: ['Принято.'] },
  { template: 'ORDER', title: 'О пожарной безопасности', data: { order_subject: 'проведении внеплановой проверки противопожарной безопасности', preamble: 'В связи с приближением новогодних праздников и в целях предупреждения пожаров', body: '1. Провести 18.12.2026 проверку всех цехов и помещений предприятия на предмет соблюдения требований пожарной безопасности.\n2. Назначить комиссию: председатель — Григорьев О.П.; члены — Михайлова Е.С., Соловьёва Т.Ю.\n3. По результатам проверки представить акт с замечаниями.', control: 'главного механика Григорьева О.П.' }, author: 'director', approvers: ['ogm'], daysAgo: 11, status: 'approved', comments: ['Принято.'] },
  { template: 'ORDER', title: 'О назначении ответственного за энергоресурсы', data: { order_subject: 'назначении ответственного за рациональное использование энергетических ресурсов', preamble: 'В целях исполнения требований Федерального закона №261-ФЗ', body: '1. Назначить ответственным за энергосбережение и рациональное использование энергоресурсов на предприятии главного механика Григорьева О.П.\n2. Утвердить ежемесячный отчёт по потреблению электроэнергии, воды и тепла.\n3. Разработать программу энергосбережения на 2027 год до 01.02.2027.', control: 'директора по производству Соколова Д.В.' }, author: 'director', approvers: ['ogm', 'prod_dir'], daysAgo: 2, status: 'draft' },

  // ===== MEMO — служебные записки (10) =====
  { template: 'MEMO', title: 'О закупке новых резцов', data: { addressee: 'Начальнику цеха №2 Сидоровой А.С.', subject: 'Необходимость закупки токарного инструмента', body: 'Сообщаю, что на токарном участке заканчиваются проходные резцы Т15К6. Остаток на складе — 3 шт. при среднем расходе 8–10 шт. в месяц. Прошу инициировать заявку на закупку 10 шт.' }, author: 'novikov', approvers: ['manager'], daysAgo: 102, status: 'archived', comments: ['Принято к сведению. Заявку оформит Фёдоров.'] },
  { template: 'MEMO', title: 'О простое станка 16К20', data: { addressee: 'Главному механику Григорьеву О.П.', subject: 'Простой токарного станка 16К20 №2014', body: 'Уведомляю, что в связи с биением шпинделя токарного станка 16К20 (инв. №2014) производство деталей В-12.220 приостановлено. Бригада из 3 человек переведена на другой участок. Прошу ускорить ремонт.' }, author: 'manager', approvers: ['ogm', 'prod_dir'], daysAgo: 76, status: 'executed', comments: ['Принято. Ремонт начат сегодня.', 'Контролируется.'] },
  { template: 'MEMO', title: 'О низком качестве СОЖ', data: { addressee: 'Директору по производству Соколову Д.В.', subject: 'Качество СОЖ — снижение стойкости инструмента', body: 'За последний месяц зафиксировано снижение стойкости резцов в среднем на 18%. Анализ показал, что причина — расслоение СОЖ в системе токарных станков. Предлагаю провести полную замену СОЖ во всех системах цеха №2.' }, author: 'manager', approvers: ['prod_dir'], daysAgo: 41, status: 'approved', comments: ['Согласовано. Запланировать на следующую неделю.'] },
  { template: 'MEMO', title: 'О предоставлении отпуска', data: { addressee: 'Начальнику отдела кадров Соловьёвой Т.Ю.', subject: 'Заявление о предоставлении ежегодного отпуска', body: 'Прошу предоставить ежегодный оплачиваемый отпуск продолжительностью 14 календарных дней в период с 22.12.2026 по 04.01.2027 в счёт отпуска за 2026 год.' }, author: 'semenov', approvers: ['ch3', 'hr'], daysAgo: 27, status: 'approved', comments: ['Согласовано.', 'Принято к оформлению.'] },
  { template: 'MEMO', title: 'О задержке поставки чугуна', data: { addressee: 'Главному бухгалтеру Зайцевой М.И.', subject: 'Задержка поставки чугуна ЛСтЧ-1 по договору №ПС-2026-77', body: 'Поставка чугуна ЛСтЧ-1 в объёме 2000 кг по договору №ПС-2026-77 от 10.10.2026, ожидаемая 25.11.2026, не состоялась. Поставщик ссылается на проблемы с транспортом. Прошу рассмотреть возможность применения штрафных санкций согласно договору.' }, author: 'storekeeper', approvers: ['buh', 'director'], daysAgo: 31, status: 'on_review', comments: ['Подтверждаю.', null] },
  { template: 'MEMO', title: 'О работе в выходной день', data: { addressee: 'Начальнику цеха №2 Сидоровой А.С.', subject: 'Согласие на работу в выходной день 20.12.2026', body: 'В связи с производственной необходимостью (срочный заказ) готов выйти на работу в выходной день 20.12.2026 (суббота). С двойной оплатой согласно ТК РФ ознакомлен.' }, author: 'fedorov', approvers: ['manager'], daysAgo: 9, status: 'approved', comments: ['Принято.'] },
  { template: 'MEMO', title: 'О необходимости обучения по ОТ', data: { addressee: 'Начальнику отдела кадров Соловьёвой Т.Ю.', subject: 'Очередное обучение работников по охране труда', body: 'Истекает срок действия удостоверений по охране труда у 12 работников цехов №1, №2, №3. Прошу организовать обучение в учебном центре с привлечением сторонней организации до конца января 2027 г.' }, author: 'otk', approvers: ['hr', 'director'], daysAgo: 19, status: 'on_review', comments: ['Согласовано.', null] },
  { template: 'MEMO', title: 'О вентиляции в цехе №3', data: { addressee: 'Главному механику Григорьеву О.П.', subject: 'Неудовлетворительная работа вентиляции в цехе №3', body: 'На сварочном участке цеха №3 наблюдается недостаточная вытяжка. Сварщики жалуются на повышенную загазованность. Замеры показали превышение ПДК по оксидам азота. Прошу провести осмотр вентустановок и устранить недостатки.' }, author: 'ch3', approvers: ['ogm', 'otk'], daysAgo: 24, status: 'approved', comments: ['Согласовано. Бригада выедет завтра.', 'Принято.'] },
  { template: 'MEMO', title: 'О пересмотре нормативов времени', data: { addressee: 'Директору по производству Соколову Д.В.', subject: 'Пересмотр нормативов времени по деталям В-12.220', body: 'В связи с модернизацией токарного станка 16К20 и применением новой геометрии резцов фактическое штучное время по детали В-12.220 снизилось с 6,2 до 4,8 мин. Предлагаю пересмотреть норматив и внести изменения в технологическую документацию.' }, author: 'manager', approvers: ['prod_dir'], daysAgo: 7, status: 'on_review', comments: [null] },
  { template: 'MEMO', title: 'О поощрении бригады сборщиков', data: { addressee: 'Генеральному директору Петрову П.П.', subject: 'Ходатайство о поощрении бригады', body: 'Прошу рассмотреть возможность поощрения бригады сборочного участка цеха №3 в составе 5 человек (бригадир Алексеев Р.С.) за досрочное выполнение монтажа партии редукторов 12.808 — на 4 дня раньше плана.' }, author: 'ch3', approvers: ['director'], daysAgo: 1, status: 'draft' },

  // ===== JOB_APP — заявки на работу (5) =====
  { template: 'JOB_APP', title: 'Захаров И.А. — токарь 5 разряда', data: { candidate_name: 'Захаров Игорь Александрович', birth_date: '1988-04-12', phone: '+7 (912) 345-67-89', desired_position: 'Токарь 5 разряда', desired_department: 'Цех №2 (механический)', experience_years: 12, last_employer: 'ОАО «Уральский машиностроительный завод», г. Екатеринбург', education: 'Среднее профессиональное. Свердловский машиностроительный колледж, специальность "Технология машиностроения", 2008 г. Удостоверение токаря 5 разряда.', desired_salary: 75000, start_date: '2027-01-15' }, author: 'hr', approvers: ['manager', 'director'], daysAgo: 13, status: 'on_review', comments: ['Кандидат сильный, опыт релевантный. Согласовано.', null] },
  { template: 'JOB_APP', title: 'Никитина С.В. — оператор ЧПУ', data: { candidate_name: 'Никитина Светлана Викторовна', birth_date: '1993-09-25', phone: '+7 (903) 222-11-44', desired_position: 'Оператор станков с ЧПУ', desired_department: 'Цех №2 (механический)', experience_years: 6, last_employer: 'ООО «ТехноПром»', education: 'Среднее профессиональное. Политехнический колледж, оператор ЧПУ, 2014 г. Курсы Heidenhain TNC 640, 2022 г.', desired_salary: 70000, start_date: '2027-02-01' }, author: 'hr', approvers: ['manager', 'prod_dir', 'director'], daysAgo: 6, status: 'on_review', comments: [null, null, null] },
  { template: 'JOB_APP', title: 'Павлов А.Д. — электросварщик', data: { candidate_name: 'Павлов Артур Денисович', birth_date: '1990-01-07', phone: '+7 (965) 778-12-33', desired_position: 'Электросварщик ручной сварки 4 разряда', desired_department: 'Цех №3 (сборочный)', experience_years: 9, last_employer: 'Самостоятельная занятость / шабашка', education: 'Среднее профессиональное. ПТУ №14, электрогазосварщик, 2010 г. НАКС — действующее удостоверение.', desired_salary: 68000, start_date: '2027-01-20' }, author: 'hr', approvers: ['ch3', 'director'], daysAgo: 17, status: 'rejected', comments: ['Без официального трудового стажа за последние 3 года — рискованно.', 'Отклонено. Рекомендую кандидату обратиться через 6 мес. при наличии подтверждённого опыта.'], rejectedAt: 2 },
  { template: 'JOB_APP', title: 'Романов В.С. — слесарь-ремонтник', data: { candidate_name: 'Романов Виктор Сергеевич', birth_date: '1985-06-30', phone: '+7 (917) 444-55-66', desired_position: 'Слесарь-ремонтник 5 разряда', desired_department: 'ОГМ', experience_years: 15, last_employer: 'ОАО «Сельмаш», г. Ростов-на-Дону', education: 'Среднее профессиональное. Ростовский техникум, слесарь-ремонтник, 2005 г.', desired_salary: 72000, start_date: '2027-01-25' }, author: 'hr', approvers: ['ogm', 'director'], daysAgo: 4, status: 'on_review', comments: [null, null] },
  { template: 'JOB_APP', title: 'Кравцов И.О. — мастер участка', data: { candidate_name: 'Кравцов Илья Олегович', birth_date: '1982-11-18', phone: '+7 (926) 111-22-33', desired_position: 'Мастер сборочного участка', desired_department: 'Цех №3 (сборочный)', experience_years: 18, last_employer: 'ЗАО «Машпроект», г. Тула', education: 'Высшее. МГТУ им. Баумана, "Машины и технология обработки металлов давлением", 2005 г. Профпереподготовка по управлению производством, 2019 г.', desired_salary: 95000, start_date: '2027-02-10' }, author: 'hr', approvers: ['ch3', 'prod_dir', 'director'], daysAgo: 50, status: 'executed', comments: ['Сильный руководитель. Согласовано.', 'Согласовано — нужен опытный мастер.', 'Утверждено. Оформлять.'] },
]

function ensureTemplate(db: Database.Database): void {
  const exists = db.prepare('SELECT id FROM templates WHERE code = ?').get(JOB_APP_TEMPLATE.code)
  if (exists) return
  db.prepare(
    `INSERT INTO templates (code, title, description, fields_json, body_template) VALUES (?, ?, ?, ?, ?)`,
  ).run(
    JOB_APP_TEMPLATE.code,
    JOB_APP_TEMPLATE.title,
    JOB_APP_TEMPLATE.description,
    JSON.stringify(JOB_APP_TEMPLATE.fields),
    JOB_APP_TEMPLATE.body,
  )
}

function ensureUsers(db: Database.Database): Map<string, number> {
  const insert = db.prepare(
    `INSERT INTO users (username, password_hash, full_name, role, department, position, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now', ?))`,
  )
  for (const u of EXTRA_USERS) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username)
    if (existing) continue
    const hash = bcrypt.hashSync(u.password, 10)
    insert.run(u.username, hash, u.full_name, u.role, u.department, u.position, '-200 days')
  }

  const rows = db
    .prepare('SELECT id, username FROM users')
    .all() as { id: number; username: string }[]
  const map = new Map<string, number>()
  for (const r of rows) map.set(r.username, r.id)
  return map
}

function renderBody(template: string, vars: Record<string, string | number>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

function generateDocs(db: Database.Database, users: Map<string, number>): void {
  const templates = db
    .prepare('SELECT id, code, body_template FROM templates')
    .all() as { id: number; code: string; body_template: string }[]
  const tplByCode = new Map(templates.map((t) => [t.code, t]))

  const userById = new Map<number, { full_name: string; position: string; department: string }>()
  const allUserRows = db
    .prepare('SELECT id, full_name, position, department FROM users')
    .all() as { id: number; full_name: string; position: string; department: string }[]
  for (const u of allUserRows) userById.set(u.id, u)

  let yearCounter = 0
  const insertDoc = db.prepare(
    `INSERT INTO documents (number, template_id, title, status, author_id, data_json, body_rendered, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
  )
  const insertStep = db.prepare(
    `INSERT INTO approval_steps (document_id, approver_id, step_order, status, comment, acted_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const insertAudit = db.prepare(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, 'document', ?, ?, datetime('now', ?))`,
  )

  for (const d of DEMO_DOCS) {
    const tpl = tplByCode.get(d.template)
    if (!tpl) continue
    const authorId = users.get(d.author)
    if (!authorId) continue
    const author = userById.get(authorId)!
    yearCounter += 1
    const number = `${d.template}-2026-${String(yearCounter).padStart(4, '0')}`
    const createdOffset = `${-d.daysAgo} days`
    const updatedOffset = `${-Math.max(0, d.daysAgo - 5)} days`

    const createdDateStr = new Date(Date.now() - d.daysAgo * 86400_000).toLocaleDateString('ru-RU')
    const vars: Record<string, string | number> = {
      ...d.data,
      number,
      created_date: createdDateStr,
      author_name: author.full_name,
      author_position: author.position ?? '',
      author_department: author.department ?? '',
    }
    const body = renderBody(tpl.body_template, vars)

    const info = insertDoc.run(
      number,
      tpl.id,
      d.title,
      d.status,
      authorId,
      JSON.stringify(d.data),
      body,
      createdOffset,
      updatedOffset,
    )
    const docId = info.lastInsertRowid as number

    insertAudit.run(authorId, 'create_document', docId, `Создан документ ${number}`, createdOffset)

    if (d.status !== 'draft') {
      const submitOffset = `${-Math.max(0, d.daysAgo - 1)} days`
      insertAudit.run(authorId, 'submit_for_review', docId, `${number}: на согласование`, submitOffset)
    }

    d.approvers.forEach((appUsername, idx) => {
      const approverId = users.get(appUsername)
      if (!approverId) return
      const stepOrder = idx + 1
      const comment = d.comments?.[idx] ?? null

      let stepStatus: 'pending' | 'approved' | 'rejected' | 'skipped' = 'pending'
      let actedAt: string | null = null

      if (d.status === 'on_review') {
        if (comment) {
          stepStatus = 'approved'
          actedAt = `datetime('now', '${-(d.daysAgo - (idx + 1) * 2)} days')`
        }
      } else if (d.status === 'rejected') {
        if (d.rejectedAt && stepOrder < d.rejectedAt) {
          stepStatus = 'approved'
          actedAt = `datetime('now', '${-(d.daysAgo - (idx + 1) * 2)} days')`
        } else if (d.rejectedAt && stepOrder === d.rejectedAt) {
          stepStatus = 'rejected'
          actedAt = `datetime('now', '${-(d.daysAgo - (idx + 1) * 2)} days')`
        } else {
          stepStatus = 'skipped'
        }
      } else {
        // approved / executed / archived → all steps approved
        stepStatus = 'approved'
        actedAt = `datetime('now', '${-(d.daysAgo - (idx + 1) * 2)} days')`
      }

      // Insert with raw datetime expression via separate prepare
      if (actedAt) {
        db.prepare(
          `INSERT INTO approval_steps (document_id, approver_id, step_order, status, comment, acted_at)
           VALUES (?, ?, ?, ?, ?, ${actedAt})`,
        ).run(docId, approverId, stepOrder, stepStatus, comment)
      } else {
        insertStep.run(docId, approverId, stepOrder, stepStatus, comment, null)
      }

      if (stepStatus === 'approved') {
        insertAudit.run(
          approverId,
          'approve_step',
          docId,
          `${number}: согласовано${comment ? ' — ' + comment : ''}`,
          `${-(d.daysAgo - (idx + 1) * 2)} days`,
        )
      } else if (stepStatus === 'rejected') {
        insertAudit.run(
          approverId,
          'reject_step',
          docId,
          `${number}: отклонено — ${comment ?? ''}`,
          `${-(d.daysAgo - (idx + 1) * 2)} days`,
        )
      }
    })

    if (d.status === 'executed') {
      insertAudit.run(
        authorId,
        'mark_executed',
        docId,
        `${number}: исполнено`,
        `${-Math.max(0, d.daysAgo - 4)} days`,
      )
    }
    if (d.status === 'archived') {
      insertAudit.run(
        authorId,
        'archive',
        docId,
        `${number}: в архив`,
        `${-Math.max(0, d.daysAgo - 6)} days`,
      )
    }
  }
}

export function seedDemoIfNeeded(db: Database.Database): void {
  const versionRow = db.pragma('user_version', { simple: true }) as number
  if (versionRow >= DEMO_VERSION) return

  const docCount = (db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number }).c
  // If user has > 5 docs already, skip to preserve their data
  if (docCount > 5) {
    db.pragma(`user_version = ${DEMO_VERSION}`)
    return
  }

  const tx = db.transaction(() => {
    // Wipe any small leftover state from earlier sessions to keep numbering clean
    db.exec(`DELETE FROM audit_log; DELETE FROM approval_steps; DELETE FROM documents;`)
    ensureTemplate(db)
    const users = ensureUsers(db)
    generateDocs(db, users)
  })
  tx()
  db.pragma(`user_version = ${DEMO_VERSION}`)
}
