export interface WindowData {
  number: number
  title: string
  subtitle: string
  description: string
  systemLevel: 'super' | 'system' | 'sub'
  timeFrame: 'past' | 'present' | 'future'
  gridRow: number
  gridCol: number
  questions: string[]
}

export const SYSTEM_LEVELS = {
  super: 'מערכת-על',
  system: 'מערכת',
  sub: 'תת-מערכת',
}

export const TIME_FRAMES = {
  past: 'עבר',
  present: 'הווה',
  future: 'עתיד',
}

export const WINDOWS: WindowData[] = [
  {
    number: 1,
    title: 'איך זה נראה היום?',
    subtitle: 'העוגן לתהליך',
    description: 'ממפים את המצב הקיים — הנקודה שהכי כואבת לנו, שמניעה את התהליך.',
    systemLevel: 'system',
    timeFrame: 'present',
    gridRow: 2,
    gridCol: 2,
    questions: [
      'נסו לתאר את האתגר — איך זה נראה היום?',
      'מה חסר היום במערכת? מה יש יותר מדי ממנו?',
      'מי מרוויח מהמצב היום? מי מפסיד?',
      'אילו סתירות קיימות היום בין המטרות לבין מה שקורה בפועל?',
    ],
  },
  {
    number: 2,
    title: 'מה קורה בפנים?',
    subtitle: 'זום-אין: פירוק הבעיה',
    description: 'צוללים פנימה לרכיבים — מפרקים את השלם לחלקים ורואים את הדברים מנקודת מבטם.',
    systemLevel: 'sub',
    timeFrame: 'present',
    gridRow: 3,
    gridCol: 2,
    questions: [
      'מאילו חלקים מורכבת המערכת? איך האתגר בא לידי ביטוי בכל אחד?',
      'אילו כוחות פועלים בין הרכיבים השונים?',
      'איזה רכיב עושה פעולה שנוגדת את המטרה הכללית?',
      'אם הייתי רכיב קטן בתוך המערכת — מה הייתי מרגיש?',
    ],
  },
  {
    number: 3,
    title: 'מה קורה סביבנו?',
    subtitle: 'זום-אאוט: הקשר חיצוני',
    description: 'פותחים את המבט החוצה — בוחנים את הסביבה שבה המערכת פועלת.',
    systemLevel: 'super',
    timeFrame: 'present',
    gridRow: 1,
    gridCol: 2,
    questions: [
      'מה הסביבה הגדולה יותר שהמערכת שלנו היא חלק ממנה?',
      'אילו גורמים חיצוניים משפיעים על המערכת?',
      'מי מרוויח מהמצב? מי מפסיד?',
      'איפה בעולם זה נראה אחרת?',
    ],
  },
  {
    number: 4,
    title: 'מה קרה בסביבה?',
    subtitle: 'תנאי הרקע',
    description: 'הולכים אחורה בזמן — מזהים את תנאי הרקע שאפשרו לבעיה לצמוח.',
    systemLevel: 'super',
    timeFrame: 'past',
    gridRow: 1,
    gridCol: 1,
    questions: [
      'מה הוביל לעיצוב המציאות הזאת?',
      'אילו אינטרסים השפיעו על המציאות?',
      'מי היו השחקנים המרכזיים ומה הניע אותם?',
      'אילו יכולתי לחזור אחורה — מה הייתי משנה?',
    ],
  },
  {
    number: 5,
    title: 'מה עשינו עד היום?',
    subtitle: 'ההיסטוריה שלנו',
    description: 'מתחקים אחר החלטות ופעולות שביצענו, ניסיונות שנעשו.',
    systemLevel: 'system',
    timeFrame: 'past',
    gridRow: 2,
    gridCol: 1,
    questions: [
      'אילו ניסיונות נעשו לשינוי המציאות?',
      'איך המערכת נראתה לפני הגלגול הנוכחי?',
      'אילו החלטות בעבר יצרו את המצב הקיים?',
      'אם היית חוזר אחורה בזמן — מה היית עושה אחרת?',
    ],
  },
  {
    number: 6,
    title: 'מה השתנה בפנים?',
    subtitle: 'הרכיבים בעבר',
    description: 'מתבוננים ברכיבים — איך השתנו לאורך הדרך ואיך התמודדו.',
    systemLevel: 'sub',
    timeFrame: 'past',
    gridRow: 3,
    gridCol: 1,
    questions: [
      'איך התמודדו עם האתגר עד כה?',
      'מאילו רכיבים הייתה המערכת מורכבת בעבר?',
      'אילו חלקים הוסרו או הוחלפו? למה?',
      'אילו חלקים חדשים התווספו? למה?',
    ],
  },
  {
    number: 7,
    title: 'לאן העולם צועד?',
    subtitle: 'מגמות-על',
    description: 'נושאים עיניים לעתיד — לאן העולם צועד כדי שנוכל לרכוב על המגמות.',
    systemLevel: 'super',
    timeFrame: 'future',
    gridRow: 1,
    gridCol: 3,
    questions: [
      'לאן צועד השוק, החברה או הסביבה שבה המערכת צריכה לתפקד?',
      'אילו סתירות חדשות ייווצרו כשחלקים בסביבה יתפתחו בקצב שונה?',
      'מה הנכדים שלנו יחשבו על המערכת הזו?',
      'מה החסמים בפני הובלת שינוי?',
    ],
  },
  {
    number: 8,
    title: 'איך נרצה שייראה בפנים?',
    subtitle: 'דמיון העתיד',
    description: 'מדמיינים את העתיד הרצוי ברמת הרכיבים — מה ישתנה בכל חלק.',
    systemLevel: 'sub',
    timeFrame: 'future',
    gridRow: 3,
    gridCol: 3,
    questions: [
      'איך היינו רוצים שהמציאות תיראה?',
      'איך ייראו הרכיבים בעתיד?',
      'מה יקרה אם ניקח רכיב ונגדיל אותו לאינסוף? נקטין לאפס?',
      'אילו שינויים קטנים אפשר לעשות כבר מחר?',
    ],
  },
  {
    number: 9,
    title: 'מה צריך להשתנות?',
    subtitle: 'תמונת הניצחון',
    description: 'חוזרים למערכת — עם בריכת ידע רחבה ועמוקה, מגדירים מה אנחנו מנסים להשיג.',
    systemLevel: 'system',
    timeFrame: 'future',
    gridRow: 2,
    gridCol: 3,
    questions: [
      'אם לא היינו תלויים בשום דבר — איך היינו רוצים שהעתיד ייראה?',
      'אם לא נשנה כלום — איך המערכת תיראה?',
      'מה החסמים בפני הובלת שינוי?',
      'מי צריך להיות שותף כדי להוביל את השינוי?',
    ],
  },
]

export function getWindow(number: number): WindowData {
  return WINDOWS.find((w) => w.number === number)!
}

export function getGridPosition(number: number): { row: number; col: number } {
  const w = getWindow(number)
  return { row: w.gridRow, col: w.gridCol }
}
