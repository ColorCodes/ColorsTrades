import { AccountForm } from "../account-form";

export default function NewAccountPage() {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold">New account</h1>
      <AccountForm />
    </div>
  );
}
