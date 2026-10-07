"use client";

import { Code2, Copy, ExternalLink, Mail, QrCode } from "lucide-react";
import { useForm } from "@/components/builder/FormContext";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useToast } from "@/components/ui/Toast";
import { publicUrl } from "@/lib/format";

export default function SharePage() {
  const { form } = useForm();
  const toast = useToast();
  const url = publicUrl(form.slug);
  const live = form.status === "published";

  return (
    <div className="h-full overflow-y-auto bg-canvas">
      <div className="mx-auto max-w-4xl px-6 pt-10">
        <h1 className="text-2xl">Share your form</h1>
        <div className="mt-6 rounded-xl border border-line bg-white p-6">
          {!live && (
            <p className="mb-4 rounded-md bg-[#fff1c9] px-3 py-2 text-sm text-[#7a5b00]">
              This form is a draft. Publish it to start collecting responses — the link below won&apos;t work until then.
            </p>
          )}
          <p className="mb-2 text-sm font-medium">Share the link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={url} className="min-w-0 flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm" onFocus={(e) => e.target.select()} />
            <button
              onClick={() => navigator.clipboard.writeText(url).then(() => toast("Link copied"))}
              className="flex items-center justify-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-black"
            >
              <Copy size={15} /> Copy link
            </button>
            {live && (
              <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-md border border-line px-4 py-2 text-sm hover:bg-hover">
                <ExternalLink size={15} /> Open
              </a>
            )}
          </div>
        </div>
      </div>
      <ComingSoon
        items={[
          { icon: Code2, title: "Embed in a web page", body: "Standard, popup, slider and full-page embeds." },
          { icon: Mail, title: "Send by email", body: "Embed the first question right in an email." },
          { icon: QrCode, title: "QR code", body: "Download a QR code that opens your form." },
        ]}
      />
    </div>
  );
}
