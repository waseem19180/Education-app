/**
 * EduConnect Mock Database Seed Data
 * Tailored for Grade 11 Scientific (الصف الحادي عشر العلمي)
 */

import {
  UserProfile,
  SchoolClass,
  Subject,
  Teacher,
  TeacherSubject,
  Parent,
  Student,
  Exam,
  Grade,
  AttendanceRecord,
  BehaviorNote,
  Assignment,
  Announcement,
  Conversation,
  Message,
  SchoolNotification,
  AuditLog,
  SchoolEvent,
  ParentStudentLink
} from '../types/database';

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: 'class-11-sci-a',
    name: 'الصف الحادي عشر العلمي (أ)',
    grade_level: 11,
    section: 'أ',
    academic_year: '2026/2027',
    advisor_id: 'teacher-shami',
    room_number: 'قاعة الخوارزمي 204'
  },
  {
    id: 'class-11-sci-b',
    name: 'الصف الحادي عشر العلمي (ب)',
    grade_level: 11,
    section: 'ب',
    academic_year: '2026/2027',
    advisor_id: 'teacher-kurdi',
    room_number: 'قاعة ابن الهيثم 205'
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'subj-math',
    name: 'الرياضيات التخصصية',
    code: 'MATH-11',
    credit_hours: 5,
    max_score: 100,
    pass_score: 50,
    color: '#2563eb' // Blue
  },
  {
    id: 'subj-phys',
    name: 'الفيزياء الحديثة',
    code: 'PHYS-11',
    credit_hours: 4,
    max_score: 100,
    pass_score: 50,
    color: '#0891b2' // Cyan
  },
  {
    id: 'subj-chem',
    name: 'الكيمياء التحليلية',
    code: 'CHEM-11',
    credit_hours: 4,
    max_score: 100,
    pass_score: 50,
    color: '#059669' // Emerald
  },
  {
    id: 'subj-bio',
    name: 'الأحياء والوراثة',
    code: 'BIO-11',
    credit_hours: 4,
    max_score: 100,
    pass_score: 50,
    color: '#16a34a' // Green
  },
  {
    id: 'subj-arab',
    name: 'اللغة العربية والبيان',
    code: 'ARAB-11',
    credit_hours: 4,
    max_score: 100,
    pass_score: 50,
    color: '#d97706' // Amber
  },
  {
    id: 'subj-eng',
    name: 'اللغة الإنجليزية المتقدمة',
    code: 'ENG-11',
    credit_hours: 4,
    max_score: 100,
    pass_score: 50,
    color: '#7c3aed' // Purple
  },
  {
    id: 'subj-cs',
    name: 'علوم الحاسوب والخوارزميات',
    code: 'CS-11',
    credit_hours: 3,
    max_score: 100,
    pass_score: 50,
    color: '#4f46e5' // Indigo
  }
];

export const INITIAL_PROFILES: UserProfile[] = [
  // Admin
  {
    id: 'admin-1',
    email: 'admin@educonnect.school',
    full_name: 'د. سامي العبداللات',
    role: 'admin',
    phone: '+962 79 123 4567',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    national_id: '9801020304',
    created_at: '2026-08-01T08:00:00Z'
  },
  // Teachers
  {
    id: 'teacher-shami-user',
    email: 'a.shami@educonnect.school',
    full_name: 'أ. أحمد الشامي',
    role: 'teacher',
    phone: '+962 78 234 5678',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    national_id: '9841029871',
    created_at: '2026-08-15T09:00:00Z'
  },
  {
    id: 'teacher-kurdi-user',
    email: 'm.kurdi@educonnect.school',
    full_name: 'أ. محمود الكردي',
    role: 'teacher',
    phone: '+962 77 345 6789',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    national_id: '9861054321',
    created_at: '2026-08-15T09:00:00Z'
  },
  {
    id: 'teacher-saeed-user',
    email: 'm.saeed@educonnect.school',
    full_name: 'د. منى السعيد',
    role: 'teacher',
    phone: '+962 79 456 7890',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    national_id: '9872019283',
    created_at: '2026-08-15T09:00:00Z'
  },
  {
    id: 'teacher-barakat-user',
    email: 'r.barakat@educonnect.school',
    full_name: 'أ. رانية بركات',
    role: 'teacher',
    phone: '+962 78 567 8901',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200',
    national_id: '9891048372',
    created_at: '2026-08-15T09:00:00Z'
  },
  {
    id: 'teacher-najem-user',
    email: 't.najem@educonnect.school',
    full_name: 'أ. طارق نجم',
    role: 'teacher',
    phone: '+962 79 678 9012',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    national_id: '9831092837',
    created_at: '2026-08-15T09:00:00Z'
  },
  // Parents
  {
    id: 'parent-qasimi-user',
    email: 'parent.qasimi@gmail.com',
    full_name: 'م. إبراهيم القاسمي (أبو محمد)',
    role: 'parent',
    phone: '+962 79 987 6543',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200',
    national_id: '9751039485',
    created_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'parent-halwani-user',
    email: 'parent.halwani@gmail.com',
    full_name: 'د. سميرة الحلواني (أم لين)',
    role: 'parent',
    phone: '+962 78 876 5432',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    national_id: '9782049182',
    created_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'parent-abdullah-user',
    email: 'parent.abdullah@gmail.com',
    full_name: 'السيد عبد الله الكيلاني (أبو عمر)',
    role: 'parent',
    phone: '+962 77 765 4321',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
    national_id: '9721092834',
    created_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'parent-tamimi-user',
    email: 'parent.tamimi@gmail.com',
    full_name: 'أ. مها التميمي (أم سارة)',
    role: 'parent',
    phone: '+962 79 654 3210',
    avatar_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200',
    national_id: '9792038475',
    created_at: '2026-08-20T10:00:00Z'
  },
  // Students (15 students)
  {
    id: 'student-qasimi-user',
    email: 'mohammed.qasimi@student.educonnect.school',
    full_name: 'محمد إبراهيم القاسمي',
    role: 'student',
    phone: '+962 79 111 2233',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    national_id: '2009101011',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-halwani-user',
    email: 'leen.halwani@student.educonnect.school',
    full_name: 'لين سمير الحلواني',
    role: 'student',
    phone: '+962 78 222 3344',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    national_id: '2009202022',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-abdullah-user',
    email: 'omar.abdullah@student.educonnect.school',
    full_name: 'عمر عبد الله الكيلاني',
    role: 'student',
    phone: '+962 77 333 4455',
    avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200',
    national_id: '2009103033',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-tamimi-user',
    email: 'sara.tamimi@student.educonnect.school',
    full_name: 'سارة خالد التميمي',
    role: 'student',
    phone: '+962 79 444 5566',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    national_id: '2009204044',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-5-user',
    email: 'yousef.najjar@student.educonnect.school',
    full_name: 'يوسف أحمد النجار',
    role: 'student',
    national_id: '2009105055',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-6-user',
    email: 'kareem.saleh@student.educonnect.school',
    full_name: 'كريم وائل الصالح',
    role: 'student',
    national_id: '2009106066',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-7-user',
    email: 'nour.sayed@student.educonnect.school',
    full_name: 'نور الدين مروان السيد',
    role: 'student',
    national_id: '2009107077',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-8-user',
    email: 'ahmad.zahrani@student.educonnect.school',
    full_name: 'أحمد سعيد الزهراني',
    role: 'student',
    national_id: '2009108088',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-9-user',
    email: 'khaled.mansour@student.educonnect.school',
    full_name: 'خالد منذر منصور',
    role: 'student',
    national_id: '2009109099',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-10-user',
    email: 'zeinab.ali@student.educonnect.school',
    full_name: 'زينب حيدر العلي',
    role: 'student',
    national_id: '2009210010',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-11-user',
    email: 'razan.khatib@student.educonnect.school',
    full_name: 'رزان هشام الخطيب',
    role: 'student',
    national_id: '2009211011',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-12-user',
    email: 'hamza.fouad@student.educonnect.school',
    full_name: 'حمزة كمال فؤاد',
    role: 'student',
    national_id: '2009112012',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-13-user',
    email: 'mona.bayati@student.educonnect.school',
    full_name: 'منى رائد البياتي',
    role: 'student',
    national_id: '2009213013',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-14-user',
    email: 'basel.qaddoura@student.educonnect.school',
    full_name: 'باسل عماد قدورة',
    role: 'student',
    national_id: '2009114014',
    created_at: '2026-08-25T11:00:00Z'
  },
  {
    id: 'student-15-user',
    email: 'shahd.darwish@student.educonnect.school',
    full_name: 'شهد ناصر درويش',
    role: 'student',
    national_id: '2009215015',
    created_at: '2026-08-25T11:00:00Z'
  },
  // Pending Approval Profiles (For user permissions testing & workflows)
  {
    id: 'student-pending-1',
    email: 'zain.zoubi@student.educonnect.school',
    full_name: 'زين الدين خالد الزعبي',
    role: 'student',
    phone: '+962 79 555 7788',
    avatar_url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&q=80&w=200',
    approval_status: 'pending_approval',
    created_at: '2026-10-28T09:30:00Z'
  },
  {
    id: 'parent-pending-1',
    email: 'parent.najjar@gmail.com',
    full_name: 'سليمان محمود النجار (أبو زين)',
    role: 'parent',
    phone: '+962 78 444 3322',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    approval_status: 'pending_approval',
    created_at: '2026-10-29T14:15:00Z'
  }
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'teacher-shami',
    profile_id: 'teacher-shami-user',
    specialization: 'الرياضيات المتقدمة وحساب التفاضل',
    office_room: 'مكتب الهيئة التدريسية 102',
    hire_date: '2020-09-01'
  },
  {
    id: 'teacher-kurdi',
    profile_id: 'teacher-kurdi-user',
    specialization: 'الفيزياء التطبيقية والميكانيكا',
    office_room: 'مختبر الفيزياء الرئيسي',
    hire_date: '2019-09-01'
  },
  {
    id: 'teacher-saeed',
    profile_id: 'teacher-saeed-user',
    specialization: 'الكيمياء العامة والعضوية',
    office_room: 'مختبر الكيمياء التحليلية',
    hire_date: '2021-02-15'
  },
  {
    id: 'teacher-barakat',
    profile_id: 'teacher-barakat-user',
    specialization: 'علم الأحياء والوراثة البشرية',
    office_room: 'مختبر العلوم الحياتية',
    hire_date: '2022-09-01'
  },
  {
    id: 'teacher-najem',
    profile_id: 'teacher-najem-user',
    specialization: 'اللغات والآداب والعلوم الحاسوبية',
    office_room: 'قاعة اللغات 105',
    hire_date: '2018-09-01'
  }
];

export const INITIAL_TEACHER_SUBJECTS: TeacherSubject[] = [
  { id: 'ts-1', teacher_id: 'teacher-shami', subject_id: 'subj-math', class_id: 'class-11-sci-a' },
  { id: 'ts-2', teacher_id: 'teacher-shami', subject_id: 'subj-math', class_id: 'class-11-sci-b' },
  { id: 'ts-3', teacher_id: 'teacher-kurdi', subject_id: 'subj-phys', class_id: 'class-11-sci-a' },
  { id: 'ts-4', teacher_id: 'teacher-kurdi', subject_id: 'subj-phys', class_id: 'class-11-sci-b' },
  { id: 'ts-5', teacher_id: 'teacher-saeed', subject_id: 'subj-chem', class_id: 'class-11-sci-a' },
  { id: 'ts-6', teacher_id: 'teacher-barakat', subject_id: 'subj-bio', class_id: 'class-11-sci-a' },
  { id: 'ts-7', teacher_id: 'teacher-najem', subject_id: 'subj-eng', class_id: 'class-11-sci-a' },
  { id: 'ts-8', teacher_id: 'teacher-najem', subject_id: 'subj-cs', class_id: 'class-11-sci-a' }
];

export const INITIAL_PARENTS: Parent[] = [
  { id: 'parent-qasimi', profile_id: 'parent-qasimi-user', relationship: 'father', occupation: 'مهندس اتصالات' },
  { id: 'parent-halwani', profile_id: 'parent-halwani-user', relationship: 'mother', occupation: 'طبيبة استشارية' },
  { id: 'parent-abdullah', profile_id: 'parent-abdullah-user', relationship: 'father', occupation: 'محاسب قانوني' },
  { id: 'parent-tamimi', profile_id: 'parent-tamimi-user', relationship: 'mother', occupation: 'أستاذة جامعية' }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-1',
    profile_id: 'student-qasimi-user',
    student_number: '2026-1101',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-qasimi',
    birth_date: '2009-04-12',
    blood_type: 'O+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-2',
    profile_id: 'student-halwani-user',
    student_number: '2026-1102',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-halwani',
    birth_date: '2009-06-25',
    blood_type: 'A+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-3',
    profile_id: 'student-abdullah-user',
    student_number: '2026-1103',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-abdullah',
    birth_date: '2009-01-18',
    blood_type: 'B+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-4',
    profile_id: 'student-tamimi-user',
    student_number: '2026-1104',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-tamimi',
    birth_date: '2009-09-30',
    blood_type: 'AB+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-5',
    profile_id: 'student-5-user',
    student_number: '2026-1105',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-qasimi',
    birth_date: '2009-03-14',
    blood_type: 'O-',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-6',
    profile_id: 'student-6-user',
    student_number: '2026-1106',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-halwani',
    birth_date: '2009-05-19',
    blood_type: 'A-',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-7',
    profile_id: 'student-7-user',
    student_number: '2026-1107',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-abdullah',
    birth_date: '2009-07-22',
    blood_type: 'O+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-8',
    profile_id: 'student-8-user',
    student_number: '2026-1108',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-tamimi',
    birth_date: '2009-08-05',
    blood_type: 'B-',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-9',
    profile_id: 'student-9-user',
    student_number: '2026-1109',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-qasimi',
    birth_date: '2009-11-11',
    blood_type: 'A+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-10',
    profile_id: 'student-10-user',
    student_number: '2026-1110',
    class_id: 'class-11-sci-a',
    parent_id: 'parent-halwani',
    birth_date: '2009-12-02',
    blood_type: 'AB-',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-11',
    profile_id: 'student-11-user',
    student_number: '2026-1111',
    class_id: 'class-11-sci-b',
    parent_id: 'parent-abdullah',
    birth_date: '2009-02-14',
    blood_type: 'O+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-12',
    profile_id: 'student-12-user',
    student_number: '2026-1112',
    class_id: 'class-11-sci-b',
    parent_id: 'parent-tamimi',
    birth_date: '2009-04-09',
    blood_type: 'A+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-13',
    profile_id: 'student-13-user',
    student_number: '2026-1113',
    class_id: 'class-11-sci-b',
    parent_id: 'parent-qasimi',
    birth_date: '2009-08-17',
    blood_type: 'B+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-14',
    profile_id: 'student-14-user',
    student_number: '2026-1114',
    class_id: 'class-11-sci-b',
    parent_id: 'parent-halwani',
    birth_date: '2009-10-29',
    blood_type: 'O+',
    enrollment_date: '2026-09-01',
    status: 'active'
  },
  {
    id: 'student-15',
    profile_id: 'student-15-user',
    student_number: '2026-1115',
    class_id: 'class-11-sci-b',
    parent_id: 'parent-abdullah',
    birth_date: '2009-05-04',
    blood_type: 'A-',
    enrollment_date: '2026-09-01',
    status: 'active'
  }
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-math-mid',
    title: 'الاختبار النصفي - التفاضل والمحددات',
    subject_id: 'subj-math',
    subject_name: 'الرياضيات التخصصية',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-shami',
    teacher_name: 'أ. أحمد الشامي',
    date: '2026-10-15',
    max_score: 100,
    weight_percentage: 30,
    exam_type: 'midterm',
    status: 'published', // Published & visible to parents & students
    term: 'first_term',
    description: 'يشمل الوحدة الأولى والثانية (النهايات والاتصال والاشتقاق)',
    created_at: '2026-10-01T10:00:00Z'
  },
  {
    id: 'exam-phys-1',
    title: 'امتحان الشهر الأول - الميكانيكا والحركة الدائرية',
    subject_id: 'subj-phys',
    subject_name: 'الفيزياء الحديثة',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-kurdi',
    teacher_name: 'أ. محمود الكردي',
    date: '2026-10-08',
    max_score: 100,
    weight_percentage: 20,
    exam_type: 'first_month',
    status: 'published',
    term: 'first_term',
    description: 'قوانين نيوتن وتطبيقات الحركة في بعدين',
    created_at: '2026-09-25T11:00:00Z'
  },
  {
    id: 'exam-chem-lab',
    title: 'تقييم التجارب المخبرية والمعايرة',
    subject_id: 'subj-chem',
    subject_name: 'الكيمياء التحليلية',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-saeed',
    teacher_name: 'د. منى السعيد',
    date: '2026-10-22',
    max_score: 50,
    weight_percentage: 15,
    exam_type: 'practical',
    status: 'published',
    term: 'first_term',
    description: 'معايرة حمض وقاعدة وحساب التركيز المولي',
    created_at: '2026-10-10T09:00:00Z'
  },
  {
    id: 'exam-bio-draft',
    title: 'اختبار علم الوراثة المندلية (مسودة معلم)',
    subject_id: 'subj-bio',
    subject_name: 'الأحياء والوراثة',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-barakat',
    teacher_name: 'أ. رانية بركات',
    date: '2026-10-28',
    max_score: 100,
    weight_percentage: 20,
    exam_type: 'first_month',
    status: 'draft', // Under review! Only teacher & admin can see
    term: 'first_term',
    description: 'قوانين مندل الأول والثاني والسيادة المشتركة',
    created_at: '2026-10-20T12:00:00Z'
  },
  {
    id: 'exam-cs-quiz',
    title: 'كويز البرمجة وحل المشكلات بـ Python',
    subject_id: 'subj-cs',
    subject_name: 'علوم الحاسوب والخوارزميات',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-najem',
    teacher_name: 'أ. طارق نجم',
    date: '2026-10-25',
    max_score: 20,
    weight_percentage: 10,
    exam_type: 'quiz',
    status: 'published',
    term: 'first_term',
    description: 'التكرارات والمصفوفات والوظائف البرمجية',
    created_at: '2026-10-18T10:00:00Z'
  },
  {
    id: 'exam-chem-mid',
    title: 'امتحان الكيمياء النصفي - الروابط والديناميكا الحرارية',
    subject_id: 'subj-chem',
    subject_name: 'الكيمياء التحليلية',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-saeed',
    teacher_name: 'د. منى السعيد',
    date: '2026-10-29',
    max_score: 100,
    weight_percentage: 25,
    exam_type: 'midterm',
    status: 'draft', // Administered/Completed on Oct 29, but marks are still in draft (pending publishing)!
    term: 'first_term',
    description: 'تم تقديم الامتحان حضورياً، والدرجات حالياً قيد المراجعة والاعتماد',
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'exam-chem-final',
    title: 'الامتحان النهائي الموحد - الكيمياء التحليلية',
    subject_id: 'subj-chem',
    subject_name: 'الكيمياء التحليلية',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-saeed',
    teacher_name: 'د. منى السعيد',
    date: '2026-12-20',
    max_score: 100,
    weight_percentage: 40,
    exam_type: 'final',
    status: 'draft', // Upcoming
    term: 'first_term',
    description: 'الاختبار النهائي للفصل الدراسي الأول لكافة وحدات المقرر',
    created_at: '2026-11-01T08:00:00Z'
  },
  {
    id: 'exam-arab-mid',
    title: 'امتحان اللغة العربية - البلاغة وقواعد النحو',
    subject_id: 'subj-arab',
    subject_name: 'اللغة العربية والبيان',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-shami',
    teacher_name: 'أ. أحمد الشامي',
    date: '2026-10-18',
    max_score: 100,
    weight_percentage: 30,
    exam_type: 'midterm',
    status: 'published',
    term: 'first_term',
    description: 'الممنوع من الصرف والاستعارة المكنية وإعراب الجمل',
    created_at: '2026-10-05T10:00:00Z'
  },
  {
    id: 'exam-eng-mid',
    title: 'English Reading Comprehension & Writing Test',
    subject_id: 'subj-eng',
    subject_name: 'اللغة الإنجليزية المتقدمة',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-kurdi',
    teacher_name: 'أ. محمود الكردي',
    date: '2026-11-18',
    max_score: 100,
    weight_percentage: 25,
    exam_type: 'midterm',
    status: 'published', // Upcoming published exam
    term: 'first_term',
    description: 'Modules 1-3: Scientific Discoveries & Academic Essay Writing',
    created_at: '2026-11-01T09:00:00Z'
  }
];

export const INITIAL_GRADES: Grade[] = [
  // Math Midterm (max 100)
  { id: 'g-1', exam_id: 'exam-math-mid', student_id: 'student-1', score: 94, is_absent: false, feedback: 'ممتاز، حل نموذجي للمسائل الإضافية', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-2', exam_id: 'exam-math-mid', student_id: 'student-2', score: 98, is_absent: false, feedback: 'الأولى على الصف، دقة فائقة في الاشتقاق الضمني', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-3', exam_id: 'exam-math-mid', student_id: 'student-3', score: 82, is_absent: false, feedback: 'جيد جداً، انتبه لإشارات التكامل', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-4', exam_id: 'exam-math-mid', student_id: 'student-4', score: 91, is_absent: false, feedback: 'رائعة ومرتبة بالخطوات', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-5', exam_id: 'exam-math-mid', student_id: 'student-5', score: 76, is_absent: false, feedback: 'يحتاج تركيزاً أكبر في النهايات المثلثية', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-6', exam_id: 'exam-math-mid', student_id: 'student-6', score: 88, is_absent: false, feedback: 'أداء متميز', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-7', exam_id: 'exam-math-mid', student_id: 'student-7', score: 65, is_absent: false, feedback: 'مستوى متوسط، يوصى بحصص التقوية المدرسية', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-8', exam_id: 'exam-math-mid', student_id: 'student-8', score: 85, is_absent: false, feedback: 'عمل رائع', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-9', exam_id: 'exam-math-mid', student_id: 'student-9', score: 72, is_absent: false, feedback: 'تقدم ملحوظ مقارنة بالشهر الأول', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },
  { id: 'g-10', exam_id: 'exam-math-mid', student_id: 'student-10', score: 95, is_absent: false, feedback: 'حل إبداعي للمسألة الهندسية', recorded_by: 'teacher-shami-user', updated_at: '2026-10-16' },

  // Physics Exam 1 (max 100)
  { id: 'g-11', exam_id: 'exam-phys-1', student_id: 'student-1', score: 92, is_absent: false, feedback: 'إلمام عميق بقوانين الحركة', recorded_by: 'teacher-kurdi-user', updated_at: '2026-10-09' },
  { id: 'g-12', exam_id: 'exam-phys-1', student_id: 'student-2', score: 96, is_absent: false, feedback: 'ممتازة في تحليل متجهات السرعة', recorded_by: 'teacher-kurdi-user', updated_at: '2026-10-09' },
  { id: 'g-13', exam_id: 'exam-phys-1', student_id: 'student-3', score: 79, is_absent: false, feedback: 'جيد، مراجعة الاحتكاك الحركي', recorded_by: 'teacher-kurdi-user', updated_at: '2026-10-09' },
  { id: 'g-14', exam_id: 'exam-phys-1', student_id: 'student-4', score: 89, is_absent: false, feedback: 'استيعاب متميز للمفاهيم', recorded_by: 'teacher-kurdi-user', updated_at: '2026-10-09' },
  { id: 'g-15', exam_id: 'exam-phys-1', student_id: 'student-5', score: 84, is_absent: false, feedback: 'إجابات واضحة', recorded_by: 'teacher-kurdi-user', updated_at: '2026-10-09' },

  // Chemistry Lab (max 50)
  { id: 'g-16', exam_id: 'exam-chem-lab', student_id: 'student-1', score: 48, is_absent: false, feedback: 'دقة عالية في المعايرة', recorded_by: 'teacher-saeed-user', updated_at: '2026-10-23' },
  { id: 'g-17', exam_id: 'exam-chem-lab', student_id: 'student-2', score: 50, is_absent: false, feedback: 'تقرير مخبري مكتمل وخال من الأخطاء', recorded_by: 'teacher-saeed-user', updated_at: '2026-10-23' },
  { id: 'g-18', exam_id: 'exam-chem-lab', student_id: 'student-3', score: 42, is_absent: false, feedback: 'التزام بإجراءات السلامة المخبرية', recorded_by: 'teacher-saeed-user', updated_at: '2026-10-23' },
  { id: 'g-19', exam_id: 'exam-chem-lab', student_id: 'student-4', score: 47, is_absent: false, feedback: 'ممتاز', recorded_by: 'teacher-saeed-user', updated_at: '2026-10-23' },

  // Bio draft grades (entered by teacher, but NOT published yet)
  { id: 'g-20', exam_id: 'exam-bio-draft', student_id: 'student-1', score: 88, is_absent: false, feedback: 'مسودة', recorded_by: 'teacher-barakat-user', updated_at: '2026-10-29' },
  { id: 'g-21', exam_id: 'exam-bio-draft', student_id: 'student-2', score: 94, is_absent: false, feedback: 'مسودة', recorded_by: 'teacher-barakat-user', updated_at: '2026-10-29' },

  // CS Quiz (max 20)
  { id: 'g-22', exam_id: 'exam-cs-quiz', student_id: 'student-1', score: 20, is_absent: false, feedback: 'كود منظم وخوارزمية سريعة', recorded_by: 'teacher-najem-user', updated_at: '2026-10-26' },
  { id: 'g-23', exam_id: 'exam-cs-quiz', student_id: 'student-2', score: 19, is_absent: false, feedback: 'ممتازة', recorded_by: 'teacher-najem-user', updated_at: '2026-10-26' },
  { id: 'g-24', exam_id: 'exam-cs-quiz', student_id: 'student-3', score: 17, is_absent: false, feedback: 'جيد جداً', recorded_by: 'teacher-najem-user', updated_at: '2026-10-26' },
  { id: 'g-25', exam_id: 'exam-cs-quiz', student_id: 'student-4', score: 20, is_absent: false, feedback: 'علامة كاملة', recorded_by: 'teacher-najem-user', updated_at: '2026-10-26' }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Today's daily attendance - Class A
  { id: 'att-1', student_id: 'student-1', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-2', student_id: 'student-2', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-3', student_id: 'student-3', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'late', reason: 'تأخر في حافلة المدرسة 15 دقيقة', notes: 'تم إدخال الطالب للصف وإشعار المشرف', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:25:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:25:00Z' },
  { id: 'att-4', student_id: 'student-4', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-5', student_id: 'student-5', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'absent', reason: 'عذر مرضي مقدم من ولي الأمر مسبقاً', notes: 'تم استلام تقرير المستوصف', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-6', student_id: 'student-6', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-7', student_id: 'student-7', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-8', student_id: 'student-8', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-9', student_id: 'student-9', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'excused', reason: 'تمثيل المدرسة في مسابقة الروبوت', notes: 'مهمة رسمية معتمدة من الإدارة', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },
  { id: 'att-10', student_id: 'student-10', class_id: 'class-11-sci-a', date: '2026-11-01', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-11-01T08:10:00Z', updated_by: 'teacher-shami-user', updated_at: '2026-11-01T08:10:00Z' },

  // Today's daily attendance - Class B
  { id: 'att-11', student_id: 'student-11', class_id: 'class-11-sci-b', date: '2026-11-01', status: 'present', recorded_by: 'teacher-kurdi-user', recorded_at: '2026-11-01T08:15:00Z', updated_by: 'teacher-kurdi-user', updated_at: '2026-11-01T08:15:00Z' },
  { id: 'att-12', student_id: 'student-12', class_id: 'class-11-sci-b', date: '2026-11-01', status: 'present', recorded_by: 'teacher-kurdi-user', recorded_at: '2026-11-01T08:15:00Z', updated_by: 'teacher-kurdi-user', updated_at: '2026-11-01T08:15:00Z' },
  { id: 'att-13', student_id: 'student-13', class_id: 'class-11-sci-b', date: '2026-11-01', status: 'late', reason: 'مراجعة طبيب الأسنان', notes: 'تم إحضار إشعار الطبيب', recorded_by: 'teacher-kurdi-user', recorded_at: '2026-11-01T08:35:00Z', updated_by: 'teacher-kurdi-user', updated_at: '2026-11-01T08:35:00Z' },
  { id: 'att-14', student_id: 'student-14', class_id: 'class-11-sci-b', date: '2026-11-01', status: 'present', recorded_by: 'teacher-kurdi-user', recorded_at: '2026-11-01T08:15:00Z', updated_by: 'teacher-kurdi-user', updated_at: '2026-11-01T08:15:00Z' },
  { id: 'att-15', student_id: 'student-15', class_id: 'class-11-sci-b', date: '2026-11-01', status: 'present', recorded_by: 'teacher-kurdi-user', recorded_at: '2026-11-01T08:15:00Z', updated_by: 'teacher-kurdi-user', updated_at: '2026-11-01T08:15:00Z' },

  // Historical daily attendance records
  { id: 'att-hist-1', student_id: 'student-1', class_id: 'class-11-sci-a', date: '2026-10-31', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-10-31T08:00:00Z' },
  { id: 'att-hist-2', student_id: 'student-1', class_id: 'class-11-sci-a', date: '2026-10-30', status: 'present', recorded_by: 'teacher-shami-user', recorded_at: '2026-10-30T08:00:00Z' },
  { id: 'att-hist-3', student_id: 'student-3', class_id: 'class-11-sci-a', date: '2026-10-30', status: 'late', reason: 'تأخر صباحي', recorded_by: 'teacher-shami-user', recorded_at: '2026-10-30T08:50:00Z' },
  { id: 'att-hist-4', student_id: 'student-3', class_id: 'class-11-sci-a', date: '2026-10-27', status: 'absent', reason: 'غياب غير مبرر', recorded_by: 'teacher-shami-user', recorded_at: '2026-10-27T08:00:00Z' }
];

export const INITIAL_BEHAVIOR_NOTES: BehaviorNote[] = [
  {
    id: 'note-1',
    student_id: 'student-1',
    student_name: 'محمد إبراهيم القاسمي',
    teacher_id: 'teacher-shami',
    teacher_name: 'أ. أحمد الشامي',
    type: 'academic',
    severity: 'low',
    status: 'resolved',
    title: 'تميز أكاديمي وحل مسائل التحدي',
    description: 'أبدى الطالب محمد مهارة استثنائية في تقديم حل بديل وبسيط لمعادلة تفاضلية من الدرجة الثانية أثناء الحصة.',
    date: '2026-10-20',
    is_visible_to_parent: true,
    action_taken: 'تكريمه بدرع التميز الأسبوعي'
  },
  {
    id: 'note-2',
    student_id: 'student-3',
    student_name: 'عمر عبد الله الكيلاني',
    teacher_id: 'teacher-kurdi',
    teacher_name: 'أ. محمود الكردي',
    type: 'behavioral',
    severity: 'medium',
    status: 'under_review',
    title: 'تكرار التأخر الصباحي عن حصة الفيزياء',
    description: 'لوحظ تأخر الطالب عمر عن الحصة الأولى 3 مرات خلال الأسبوعين الماضيين مما يؤثر على متابعته لبداية الدروس.',
    date: '2026-10-28',
    is_visible_to_parent: true,
    action_taken: 'تم إشعار المرشد التربوي وولي الأمر للمتابعة'
  },
  {
    id: 'note-3',
    student_id: 'student-7',
    student_name: 'نور الدين مروان السيد',
    teacher_id: 'teacher-saeed',
    teacher_name: 'د. منى السعيد',
    type: 'academic',
    severity: 'high',
    status: 'open',
    title: 'خطة تقوية في المفاهيم الكيميائية الأساسية',
    description: 'يحتاج الطالب إلى جلسات مراجعة في المولات والكتلة الجزيئية والمعادلات الأيونية قبل الاختبار القادم.',
    date: '2026-10-27',
    is_visible_to_parent: false, // Internal confidential note for teachers & admin
    action_taken: 'تنسيق جدول حصص الدعم الإضافية'
  }
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign-1',
    title: 'تقرير بحثي: تطبيقات الليزر في الطب الحديث',
    description: 'إعداد بحث من 3-4 صفحات يتناول ظاهرة الانبعاث المستحث وتطبيقات الليزر في الجراحة والألياف الضوئية.',
    subject_id: 'subj-phys',
    subject_name: 'الفيزياء الحديثة',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-kurdi',
    teacher_name: 'أ. محمود الكردي',
    assigned_date: '2026-10-25',
    due_date: '2026-11-05',
    max_points: 15,
    status: 'active'
  },
  {
    id: 'assign-2',
    title: 'واجب النهايات والاتصال - المسائل الكلامية',
    description: 'حل التمارين من ص 45 إلى 48 من كتاب التمارين ورفع الحلول بخط واضح.',
    subject_id: 'subj-math',
    subject_name: 'الرياضيات التخصصية',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-shami',
    teacher_name: 'أ. أحمد الشامي',
    assigned_date: '2026-10-29',
    due_date: '2026-11-03',
    max_points: 10,
    status: 'active'
  },
  {
    id: 'assign-3',
    title: 'مشروع بايثون: نظام حساب المعدل التراكمي',
    description: 'كتابة برنامج بلغة بايثون يستقبل علامات 5 مواد مع أوزانها ويخرج المعدل والتقدير.',
    subject_id: 'subj-cs',
    subject_name: 'علوم الحاسوب والخوارزميات',
    class_id: 'class-11-sci-a',
    teacher_id: 'teacher-najem',
    teacher_name: 'أ. طارق نجم',
    assigned_date: '2026-10-22',
    due_date: '2026-11-08',
    max_points: 20,
    status: 'active'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'جدول الاختبارات النصفية للصف الحادي عشر العلمي (الفصل الأول)',
    content: 'تعلن إدارة المدرسة عن اعتماد ونشر الجدول النهائي للاختبارات النصفية للعام الدراسي 2026/2027، وتبدأ الامتحانات يوم الأحد القادم في تمام الساعة التاسعة صباحاً. يرجى من جميع الطلاب الالتزام بالزي المدرسي والحضور قبل الموعد بنصف ساعة.',
    author_id: 'admin-1',
    author_name: 'د. سامي العبداللات - مدير النظام الأكاديمي',
    target_audience: 'grade_11',
    category: 'urgent',
    is_pinned: true,
    published_at: '2026-10-30T09:00:00Z'
  },
  {
    id: 'ann-2',
    title: 'انطلاق معرض الابتكار العلمي والمشاريع الطلابية السنوي',
    content: 'ندعو أولياء الأمور والطلاب الكرام لحضور افتتاح المعرض العلمي للمشاريع الريادية لمادة الفيزياء والروبوتات والذكاء الاصطناعي في مسرح المدرسة يوم الخميس القادم.',
    author_id: 'admin-1',
    author_name: 'إدارة الأنشطة العلمية',
    target_audience: 'all',
    category: 'event',
    is_pinned: false,
    published_at: '2026-10-28T11:00:00Z'
  },
  {
    id: 'ann-3',
    title: 'تفعيل الساعات الإرشادية وحصص التقوية المجانية',
    content: 'حرصاً على أعلى مستويات التحصيل الأكاديمي، يعلن قسم الرياضيات والفيزياء عن استقبال الطلاب الراغبين في مراجعة الدروس أيام الثلاثاء بعد الدوام الرسمي.',
    author_id: 'teacher-shami-user',
    author_name: 'أ. أحمد الشامي - منسق الرياضيات',
    target_audience: 'students',
    category: 'academic',
    is_pinned: false,
    published_at: '2026-10-25T14:30:00Z'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    subject_topic: 'متابعة أداء الطالب محمد القاسمي في الرياضيات والفيزياء',
    student_id: 'student-1',
    student_name: 'محمد القاسمي',
    participant_ids: ['teacher-shami-user', 'parent-qasimi-user'],
    last_message: 'شكراً جزيلاً أستاذ أحمد، سنتابع معه خطة التحضير للأولمبياد العلمي.',
    last_message_at: '2026-10-31T17:45:00Z',
    unread_count: 0
  },
  {
    id: 'conv-2',
    subject_topic: 'استفسار حول ساعات المختبر لمادة الكيمياء - لين الحلواني',
    student_id: 'student-2',
    student_name: 'لين الحلواني',
    participant_ids: ['teacher-saeed-user', 'parent-halwani-user'],
    last_message: 'أهلاً دكتورة سميرة، ابنتك لين من الطالبات الأكثر انضباطاً ويسرنا تزويدها بكتيب التجارب الإثرائي.',
    last_message_at: '2026-10-30T13:20:00Z',
    unread_count: 0
  },
  {
    id: 'conv-3',
    subject_topic: 'التأخر الصباحي وتنسيق المواصلات - عمر عبد الله',
    student_id: 'student-3',
    student_name: 'عمر عبد الله',
    participant_ids: ['teacher-shami-user', 'parent-abdullah-user'],
    last_message: 'نرجو المتابعة الحثيثة لضمان وصوله قبل قرع الجرس الصباحي.',
    last_message_at: '2026-10-29T10:15:00Z',
    unread_count: 1
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'teacher-shami-user',
    sender_name: 'أ. أحمد الشامي',
    sender_role: 'teacher',
    content: 'السلام عليكم ورحمة الله وبركاته أخ إبراهيم، أود أن أهنئكم على المستوى الرفيع الذي يقدمه محمد في الرياضيات، ونرشحه لتمثيل المدرسة في مسابقة موهبة.',
    created_at: '2026-10-31T16:00:00Z',
    is_read: true
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'parent-qasimi-user',
    sender_name: 'م. إبراهيم القاسمي',
    sender_role: 'parent',
    content: 'وعليكم السلام ورحمة الله وبركاته، بارك الله فيكم أستاذنا الفاضل. هذا بفضل جهودكم وجهود المدرسة، ونحن داعمون له بكل تأكيد.',
    created_at: '2026-10-31T16:30:00Z',
    is_read: true
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'teacher-shami-user',
    sender_name: 'أ. أحمد الشامي',
    sender_role: 'teacher',
    content: 'سأرسل لكم الكتيب التدريبي الخاص بالمسابقة للاطلاع عليه ومساعدته في حل المسائل المتقدمة.',
    created_at: '2026-10-31T17:10:00Z',
    is_read: true
  },
  {
    id: 'msg-4',
    conversation_id: 'conv-1',
    sender_id: 'parent-qasimi-user',
    sender_name: 'م. إبراهيم القاسمي',
    sender_role: 'parent',
    content: 'شكراً جزيلاً أستاذ أحمد، سنتابع معه خطة التحضير للأولمبياد العلمي.',
    created_at: '2026-10-31T17:45:00Z',
    is_read: true
  },
  {
    id: 'msg-5',
    conversation_id: 'conv-3',
    sender_id: 'teacher-shami-user',
    sender_name: 'أ. أحمد الشامي',
    sender_role: 'teacher',
    content: 'السلام عليكم أبا عمر، لاحظنا تأخر عمر عن الحصة الأولى عدة مرات هذا الأسبوع، نرجو المتابعة الحثيثة لضمان وصوله قبل قرع الجرس الصباحي.',
    created_at: '2026-10-29T10:15:00Z',
    is_read: false
  }
];

export const INITIAL_NOTIFICATIONS: SchoolNotification[] = [
  {
    id: 'notif-1',
    user_id: 'parent-qasimi-user',
    title: 'نشر نتائج الاختبار النصفي للرياضيات',
    message: 'تم اعتماد ونشر نتيجة الطالب محمد إبراهيم في مادة الرياضيات التخصصية (94/100).',
    type: 'grade',
    link_target: 'grades',
    is_read: false,
    created_at: '2026-10-16T12:00:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'student-qasimi-user',
    title: 'واجب دراسي جديد - الفيزياء الحديثة',
    message: 'أضاف أ. محمود الكردي واجباً جديداً: تقرير تطبيقات الليزر، الموعد النهائي 5 نوفمبر.',
    type: 'assignment',
    link_target: 'assignments',
    is_read: false,
    created_at: '2026-10-25T11:00:00Z'
  },
  {
    id: 'notif-3',
    user_id: 'parent-abdullah-user',
    title: 'تنبيه تأخر صباحي',
    message: 'تم تسجيل تأخر الطالب عمر عبد الله عن الحصة الأولى 15 دقيقة بتاريخ اليوم.',
    type: 'attendance',
    link_target: 'attendance',
    is_read: false,
    created_at: '2026-11-01T08:25:00Z'
  },
  {
    id: 'notif-4',
    user_id: 'teacher-shami-user',
    title: 'اعتماد نتائج الاختبارات',
    message: 'قام مدير النظام باعتماد درجات امتحان الرياضيات للشعبة (أ) بنجاح.',
    type: 'exam',
    link_target: 'exams',
    is_read: true,
    created_at: '2026-10-16T12:05:00Z'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    actor_id: 'admin-1',
    actor_name: 'د. سامي العبداللات',
    actor_role: 'admin',
    action: 'نشر درجات امتحان',
    table_name: 'exams',
    record_id: 'exam-math-mid',
    details: 'اعتماد ونشر درجات الاختبار النصفي - الرياضيات التخصصية للصف الحادي عشر (أ)',
    ip_address: '192.168.1.10',
    timestamp: '2026-10-16T12:00:00Z'
  },
  {
    id: 'audit-2',
    actor_id: 'teacher-shami-user',
    actor_name: 'أ. أحمد الشامي',
    actor_role: 'teacher',
    action: 'تسجيل الحضور اليومي',
    table_name: 'attendance',
    record_id: 'class-11-sci-a-2026-11-01',
    details: 'تسجيل حضور الحصة الأولى - الرياضيات التخصصية (10 طلاب حاضرين، 1 متأخر، 1 بعذر)',
    ip_address: '192.168.1.45',
    timestamp: '2026-11-01T08:15:00Z'
  },
  {
    id: 'audit-3',
    actor_id: 'teacher-kurdi-user',
    actor_name: 'أ. محمود الكردي',
    actor_role: 'teacher',
    action: 'إضافة واجب دراسي',
    table_name: 'assignments',
    record_id: 'assign-1',
    details: 'إضافة واجب تطبيقات الليزر في الطب الحديث لصف الحادي عشر العلمي (أ)',
    ip_address: '192.168.1.32',
    timestamp: '2026-10-25T11:00:00Z'
  },
  {
    id: 'audit-4',
    actor_id: 'admin-1',
    actor_name: 'د. سامي العبداللات',
    actor_role: 'admin',
    action: 'نشر إعلان هام',
    table_name: 'announcements',
    record_id: 'ann-1',
    details: 'تثبيت إعلان جدول الاختبارات النصفية للعام الدراسي 2026/2027',
    ip_address: '192.168.1.10',
    timestamp: '2026-10-30T09:00:00Z'
  },
  {
    id: 'audit-5',
    actor_id: 'admin-1',
    actor_name: 'د. سامي العبداللات',
    actor_role: 'admin',
    action: 'ASSIGN_TEACHER',
    table_name: 'teachers',
    record_id: 'teacher-shami',
    target_user_id: 'teacher-shami-user',
    details: 'اعتماد وتعيين المعلم أ. أحمد الشامي لمادة الرياضيات التخصصية للصف الحادي عشر (أ و ب)',
    ip_address: '192.168.1.10',
    timestamp: '2026-08-15T09:00:00Z'
  },
  {
    id: 'audit-6',
    actor_id: 'admin-1',
    actor_name: 'د. سامي العبداللات',
    actor_role: 'admin',
    action: 'APPROVE_STUDENT',
    table_name: 'students',
    record_id: 'student-1',
    target_user_id: 'student-qasimi-user',
    details: 'اعتماد وتفعيل حساب الطالب محمد إبراهيم القاسمي وتعيينه في الشعبة (أ)',
    ip_address: '192.168.1.10',
    timestamp: '2026-08-25T11:00:00Z'
  },
  {
    id: 'audit-7',
    actor_id: 'teacher-shami-user',
    actor_name: 'أ. أحمد الشامي',
    actor_role: 'teacher',
    action: 'CREATE_PARENT_LINK',
    table_name: 'parent_student_links',
    record_id: 'link-2',
    target_user_id: 'parent-halwani-user',
    details: 'طلب ربط ولي الأمر د. سميرة الحلواني بالطالبة لين سمير الحلواني (شعبة أ)',
    ip_address: '192.168.1.45',
    timestamp: '2026-08-26T10:15:00Z'
  },
  {
    id: 'audit-8',
    actor_id: 'admin-1',
    actor_name: 'د. سامي العبداللات',
    actor_role: 'admin',
    action: 'VERIFY_PARENT_LINK',
    table_name: 'parent_student_links',
    record_id: 'link-2',
    target_user_id: 'parent-halwani-user',
    details: 'اعتماد وتفعيل وثيقة ربط ولي الأمر د. سميرة الحلواني رسمياً بعد التحقق من الهوية',
    ip_address: '192.168.1.10',
    timestamp: '2026-08-26T12:00:00Z'
  }
];

export const INITIAL_PARENT_STUDENT_LINKS: ParentStudentLink[] = [
  {
    id: 'link-1',
    parent_id: 'parent-qasimi-user',
    student_id: 'student-1',
    relationship: 'father',
    status: 'active',
    created_by: 'admin-1',
    created_at: '2026-08-25T11:30:00Z',
    verified_by: 'admin-1',
    verified_at: '2026-08-25T11:30:00Z',
    notes: 'تم التحقق من صلة القرابة ومطابقة الرقم الوطني في السجلات الرسمية'
  },
  {
    id: 'link-2',
    parent_id: 'parent-halwani-user',
    student_id: 'student-2',
    relationship: 'mother',
    status: 'active',
    created_by: 'teacher-shami-user',
    created_at: '2026-08-26T10:15:00Z',
    verified_by: 'admin-1',
    verified_at: '2026-08-26T12:00:00Z',
    notes: 'تم التحقق من بيانات الأم والولاية المدرسية للشعبة (أ)'
  },
  {
    id: 'link-3',
    parent_id: 'parent-abdullah-user',
    student_id: 'student-3',
    relationship: 'father',
    status: 'active',
    created_by: 'admin-1',
    created_at: '2026-08-25T11:30:00Z',
    verified_by: 'admin-1',
    verified_at: '2026-08-25T11:30:00Z',
    notes: 'رابط نشط ومعتمد لدى الإدارة المدرسية'
  },
  {
    id: 'link-4',
    parent_id: 'parent-tamimi-user',
    student_id: 'student-4',
    relationship: 'mother',
    status: 'active',
    created_by: 'teacher-shami-user',
    created_at: '2026-08-26T10:30:00Z',
    verified_by: 'admin-1',
    verified_at: '2026-08-26T12:30:00Z',
    notes: 'تمت المصادقة على طلب الربط للشعبة (أ)'
  },
  {
    id: 'link-5',
    parent_id: 'parent-qasimi-user',
    student_id: 'student-5',
    relationship: 'guardian',
    status: 'pending',
    created_by: 'teacher-shami-user',
    created_at: '2026-10-31T09:00:00Z',
    notes: 'طلب ربط ولي أمر بصفة وصي رسمي - بانتظار استكمال فحص بطاقة العائلة واعتماد الإدارة'
  }
];

export const INITIAL_SCHOOL_EVENTS: SchoolEvent[] = [
  {
    id: 'ev-1',
    title: 'بدء الاختبارات النصفية الموحدة',
    date: '2026-11-08',
    end_date: '2026-11-19',
    type: 'exam',
    description: 'اختبارات منتصف الفصل الدراسي الأول لجميع المواد العلمية',
    target_role: 'all'
  },
  {
    id: 'ev-2',
    title: 'افتتاح المعرض العلمي السنوي',
    date: '2026-11-05',
    type: 'activity',
    description: 'معرض مشاريع الروبوتات والفيزياء والكيمياء',
    target_role: 'all'
  },
  {
    id: 'ev-3',
    title: 'عطلة رسمية (يوم الاستقلال العلمي)',
    date: '2026-11-14',
    type: 'holiday',
    description: 'تعطيل الدوام المدرسي لجميع الصفوف والهيئة التدريسية',
    target_role: 'all'
  },
  {
    id: 'ev-4',
    title: 'اجتماع أولياء الأمور الدوري للفصل الأول',
    date: '2026-11-21',
    type: 'meeting',
    description: 'لقاء مفتوح مع المعلمين لمناقشة نتائج منتصف الفصل والخطط العلاجية',
    target_role: 'parents'
  }
];
