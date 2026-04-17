import { JournalForm } from "../journal-form";

export default function NewJournalPage() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold">New entry</h1>
      <JournalForm />
    </div>
  );
}
