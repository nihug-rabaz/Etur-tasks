import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border-weak bg-surface-1 p-8 text-center shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
        <h1 className="text-2xl font-bold text-text-primary">החשבון ממתין לאישור מנהל</h1>
        <p className="mt-3 text-sm text-text-secondary">
          ההתחברות בוצעה בהצלחה, אבל עדיין אין לך הרשאות למערכת. מנהל המערכת צריך לאשר את המשתמש שלך ולהעניק
          הרשאות תת-נושא.
        </p>
        <p className="mt-2 text-xs text-text-muted">אחרי האישור אפשר לרענן את העמוד או להתחבר מחדש.</p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className="rounded-xl border border-border-weak bg-surface-2 px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-surface-3"
          >
            חזרה למסך התחברות
          </Link>
        </div>
      </div>
    </div>
  );
}
