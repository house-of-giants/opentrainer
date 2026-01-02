"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	MessageSquare,
	Bug,
	Lightbulb,
	Sparkles,
	MessageCircle,
	type LucideIcon,
} from "lucide-react";

type FeedbackType = "bug" | "feature_request" | "ai_quality" | "general";

const FEEDBACK_TYPES: Array<{
	id: FeedbackType;
	label: string;
	icon: LucideIcon;
}> = [
	{ id: "bug", label: "Bug Report", icon: Bug },
	{ id: "feature_request", label: "Feature Request", icon: Lightbulb },
	{ id: "ai_quality", label: "AI Quality", icon: Sparkles },
	{ id: "general", label: "General", icon: MessageCircle },
];

export function FeedbackButton() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submitFeedback = useMutation(api.feedback.submitFeedback);

	const handleSubmit = async () => {
		if (!selectedType) {
			toast.error("Please select a feedback type");
			return;
		}
		if (!message.trim()) {
			toast.error("Please enter your feedback");
			return;
		}

		setIsSubmitting(true);
		try {
			await submitFeedback({
				type: selectedType,
				message: message.trim(),
				context: { page: pathname },
			});
			toast.success("Thanks for your feedback!");
			setOpen(false);
			setSelectedType(null);
			setMessage("");
		} catch {
			toast.error("Failed to submit feedback");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-md backdrop-blur transition-all hover:bg-muted hover:text-foreground hover:shadow-lg"
				aria-label="Send feedback"
			>
				<MessageSquare className="h-5 w-5" />
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Send Feedback</DialogTitle>
						<DialogDescription>
							Help us improve OpenTrainer during early access.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-2">
						<div className="grid grid-cols-2 gap-2">
							{FEEDBACK_TYPES.map((type) => (
								<button
									key={type.id}
									type="button"
									onClick={() => setSelectedType(type.id)}
									className={cn(
										"flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors",
										selectedType === type.id
											? "border-primary bg-primary/10"
											: "border-border hover:bg-muted/50"
									)}
								>
									<type.icon className="h-5 w-5" />
									<span className="text-xs font-medium">{type.label}</span>
								</button>
							))}
						</div>

						<div className="space-y-2">
							<Label htmlFor="feedback-message">Your feedback</Label>
							<textarea
								id="feedback-message"
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Tell us what's on your mind..."
								className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={isSubmitting}>
							{isSubmitting ? "Sending..." : "Send"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
