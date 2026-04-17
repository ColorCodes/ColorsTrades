"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteTradeButton({ id }: { id: string }) {
  const router = useRouter();
  async function onClick() {
    if (!confirm("Delete this trade?")) return;
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Trade deleted");
    router.push("/trades");
    router.refresh();
  }
  return (
    <Button variant="destructive" className="w-fit" onClick={onClick}>
      <Trash2 className="size-4" /> Delete trade
    </Button>
  );
}
