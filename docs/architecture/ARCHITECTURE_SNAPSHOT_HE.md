# Architecture Snapshot — Alpha 0.1

- Today הוא המרכז התפעולי.
- Trip Center מבוסס קטגוריות ומשמש לניהול מידע.
- Search משני.
- Timeline ו־Today הם projections של פריטים מתוארכים.
- One Entity — One Detail View.
- יצירה נעשית דרך `+` גלובלי או קליטת מסמך.
- מידע חשוב נגיש במספר מועט של פעולות.
- תאריכי Trip אופציונליים וניתנים להוספה, שינוי והסרה ללא יצירת Trip חדש.
- שינוי טווח Trip אינו משנה אוטומטית תאריכי פריטים; הוא מסמן conflict.
- Domain אינו שייך לניווט או למסכים.

החלטת מימוש זמנית: static PWA ו־Local Storage לצורך Alpha, ללא שינוי בארכיטקטורת היעד.
