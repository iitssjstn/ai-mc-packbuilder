import { Panel } from "@/components/ui";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-6 py-10">
      <h1 className="text-lg font-semibold">Terms of Service</h1>
      <Panel>
        <p className="text-sm text-slate-400">
          This is a placeholder Terms of Service page. Replace this content
          with your actual terms before accepting real users — this text is
          not a legal document.
        </p>
      </Panel>
    </div>
  );
}
