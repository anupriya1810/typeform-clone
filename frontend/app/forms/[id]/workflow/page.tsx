import { GitBranch, Calculator, EyeOff } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default function WorkflowPage() {
  return (
    <ComingSoon
      items={[
        { icon: GitBranch, title: "Logic jumps", body: "Send respondents to different questions based on their answers." },
        { icon: Calculator, title: "Calculator & scoring", body: "Add up scores and show personalised results." },
        { icon: EyeOff, title: "Hidden fields", body: "Pass known data (like a user id) through the share URL." },
      ]}
    />
  );
}
