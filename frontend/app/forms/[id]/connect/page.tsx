import { Mail, Sheet, Users, Webhook } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function ConnectPage() {
  return (
    <ComingSoon
      items={[
        { icon: Webhook, title: "Webhooks", body: "POST every new response to your own endpoint." },
        { icon: Sheet, title: "Google Sheets", body: "Sync responses into a spreadsheet automatically." },
        { icon: Mail, title: "Email notifications", body: "Get an email whenever someone submits." },
        { icon: Users, title: "Team collaboration", body: "Invite teammates to edit forms and view results." },
      ]}
    />
  );
}
