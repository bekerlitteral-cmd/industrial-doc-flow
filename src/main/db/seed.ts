import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'

const DEFAULT_USERS: Array<{
  username: string
  password: string
  full_name: string
  role: 'employee' | 'manager' | 'admin'
  department: string
  position: string
}> = [
  {
    username: 'admin',
    password: 'admin123',
    full_name: 'Иванов Иван Иванович',
    role: 'admin',
    department: 'ИТ-отдел',
    position: 'Администратор системы',
  },
  {
    username: 'director',
    password: 'director123',
    full_name: 'Петров Пётр Петрович',
    role: 'manager',
    department: 'Дирекция',
    position: 'Генеральный директор',
  },
  {
    username: 'manager',
    password: 'manager123',
    full_name: 'Сидорова Анна Сергеевна',
    role: 'manager',
    department: 'Цех №1',
    position: 'Начальник цеха',
  },
  {
    username: 'employee',
    password: 'employee123',
    full_name: 'Кузнецов Алексей Михайлович',
    role: 'employee',
    department: 'Цех №1',
    position: 'Инженер-технолог',
  },
  {
    username: 'storekeeper',
    password: 'store123',
    full_name: 'Морозова Елена Викторовна',
    role: 'employee',
    department: 'Склад',
    position: 'Кладовщик',
  },
]

const DEFAULT_TEMPLATES = [
  {
    code: 'MEMO',
    title: 'Служебная записка',
    description: 'Внутренний документ для информирования или запроса по производственным вопросам',
    fields: [
      { key: 'addressee', label: 'Кому (должность, ФИО)', type: 'text', required: true },
      { key: 'subject', label: 'Тема', type: 'text', required: true },
      { key: 'body', label: 'Текст записки', type: 'textarea', required: true },
    ],
    body: `СЛУЖЕБНАЯ ЗАПИСКА\n\nКому: {{addressee}}\nТема: {{subject}}\n\n{{body}}\n\n{{author_position}} {{author_name}}\nДата: {{created_date}}`,
  },
  {
    code: 'REQ_MAT',
    title: 'Заявка на материалы',
    description: 'Заявка на выдачу материалов со склада промышленного предприятия',
    fields: [
      { key: 'material_name', label: 'Наименование материала', type: 'text', required: true },
      { key: 'quantity', label: 'Количество', type: 'number', required: true },
      { key: 'unit', label: 'Единица измерения', type: 'select', required: true, options: ['шт', 'кг', 'м', 'л', 'упак'] },
      { key: 'purpose', label: 'Назначение', type: 'textarea', required: true },
      { key: 'need_date', label: 'Требуется к дате', type: 'date', required: true },
    ],
    body: `ЗАЯВКА НА МАТЕРИАЛЫ\n\nНаименование: {{material_name}}\nКоличество: {{quantity}} {{unit}}\nТребуется к: {{need_date}}\n\nНазначение: {{purpose}}\n\nЗаявитель: {{author_position}}, {{author_name}}\nПодразделение: {{author_department}}\nДата составления: {{created_date}}`,
  },
  {
    code: 'ORDER',
    title: 'Приказ',
    description: 'Приказ по предприятию (распорядительный документ)',
    fields: [
      { key: 'order_subject', label: 'О чём приказ', type: 'text', required: true },
      { key: 'preamble', label: 'Преамбула (основание)', type: 'textarea', required: false },
      { key: 'body', label: 'Распорядительная часть (ПРИКАЗЫВАЮ)', type: 'textarea', required: true },
      { key: 'control', label: 'Контроль исполнения возложить на', type: 'text', required: false },
    ],
    body: `ПРИКАЗ\n№ {{number}}                от {{created_date}}\n\nО {{order_subject}}\n\n{{preamble}}\n\nПРИКАЗЫВАЮ:\n\n{{body}}\n\nКонтроль исполнения возложить на: {{control}}\n\nДиректор {{author_name}}`,
  },
  {
    code: 'ACT',
    title: 'Акт',
    description: 'Акт приёмки/списания/выполненных работ',
    fields: [
      { key: 'act_type', label: 'Тип акта', type: 'select', required: true, options: ['Приёмки', 'Списания', 'Выполненных работ', 'Брака'] },
      { key: 'subject', label: 'Объект акта (что фиксируется)', type: 'text', required: true },
      { key: 'commission', label: 'Состав комиссии', type: 'textarea', required: true },
      { key: 'findings', label: 'Установлено / Заключение', type: 'textarea', required: true },
    ],
    body: `АКТ {{act_type}}\n№ {{number}}                от {{created_date}}\n\nОбъект: {{subject}}\n\nКомиссия в составе:\n{{commission}}\n\nУстановлено:\n{{findings}}\n\nСоставил: {{author_position}} {{author_name}}`,
  },
  {
    code: 'REPAIR',
    title: 'Заявка на ремонт оборудования',
    description: 'Заявка в службу главного механика на ремонт оборудования',
    fields: [
      { key: 'equipment', label: 'Наименование оборудования', type: 'text', required: true },
      { key: 'inv_number', label: 'Инвентарный номер', type: 'text', required: true },
      { key: 'location', label: 'Место установки (цех/участок)', type: 'text', required: true },
      { key: 'failure', label: 'Описание неисправности', type: 'textarea', required: true },
      { key: 'urgency', label: 'Срочность', type: 'select', required: true, options: ['Плановый', 'Срочный', 'Аварийный'] },
    ],
    body: `ЗАЯВКА НА РЕМОНТ ОБОРУДОВАНИЯ\n№ {{number}}                от {{created_date}}\n\nОборудование: {{equipment}}\nИнвентарный номер: {{inv_number}}\nМесто: {{location}}\nСрочность: {{urgency}}\n\nОписание неисправности:\n{{failure}}\n\nЗаявитель: {{author_position}} {{author_name}}\nПодразделение: {{author_department}}`,
  },
]

export function seedIfEmpty(db: Database.Database): void {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }
  if (userCount.c === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, department, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const tx = db.transaction(() => {
      for (const u of DEFAULT_USERS) {
        const hash = bcrypt.hashSync(u.password, 10)
        insertUser.run(u.username, hash, u.full_name, u.role, u.department, u.position)
      }
    })
    tx()
  }

  const tplCount = db.prepare('SELECT COUNT(*) as c FROM templates').get() as { c: number }
  if (tplCount.c === 0) {
    const insertTpl = db.prepare(`
      INSERT INTO templates (code, title, description, fields_json, body_template)
      VALUES (?, ?, ?, ?, ?)
    `)
    const tx = db.transaction(() => {
      for (const t of DEFAULT_TEMPLATES) {
        insertTpl.run(t.code, t.title, t.description, JSON.stringify(t.fields), t.body)
      }
    })
    tx()
  }
}
