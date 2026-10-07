import { redirect } from "next/navigation";

export default async function FormIndex({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/forms/${(await params).id}/create`);
}
