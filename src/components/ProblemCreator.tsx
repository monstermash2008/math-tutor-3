import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import {
	AlertCircle,
	ArrowDown,
	ArrowUp,
	Eye,
	Plus,
	Save,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

interface ProblemFormData {
	problemStatement: string;
	problemType: "SOLVE_EQUATION" | "SIMPLIFY_EXPRESSION" | "";
	solutionSteps: string[];
	title: string;
	description: string;
	difficulty: "Easy" | "Medium" | "Hard" | "";
	subject: string;
	gradeLevel: string;
	isPublic: boolean;
	tags: string[];
}

interface ProblemCreatorProps {
	initialData?: Partial<ProblemFormData>;
	onSave?: (problemId: string) => void;
	onCancel?: () => void;
}

export default function ProblemCreator({
	initialData,
	onSave,
	onCancel,
}: ProblemCreatorProps) {
	const [formData, setFormData] = useState<ProblemFormData>({
		problemStatement: "",
		problemType: "",
		solutionSteps: [""],
		title: "",
		description: "",
		difficulty: "",
		subject: "",
		gradeLevel: "",
		isPublic: true,
		tags: [],
		...initialData,
	});

	const [currentTag, setCurrentTag] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);

	const createProblem = useMutation(api.problems.createProblem);
	const stepRefs = useRef<(HTMLInputElement | null)[]>([]);

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!formData.problemStatement.trim()) {
			newErrors.problemStatement = "Problem statement is required";
		}

		if (!formData.problemType) {
			newErrors.problemType = "Problem type is required";
		}

		if (!formData.difficulty) {
			newErrors.difficulty = "Difficulty is required";
		}

		const validSteps = formData.solutionSteps.filter((step) => step.trim());
		if (validSteps.length === 0) {
			newErrors.solutionSteps = "At least one solution step is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsSaving(true);

		try {
			// Filter out empty steps
			const cleanSteps = formData.solutionSteps.filter((step) => step.trim());

			const problemData = {
				problemStatement: formData.problemStatement.trim(),
				problemType: formData.problemType as
					| "SOLVE_EQUATION"
					| "SIMPLIFY_EXPRESSION",
				solutionSteps: cleanSteps,
				title: formData.title.trim() || undefined,
				description: formData.description.trim() || undefined,
				difficulty: formData.difficulty as "Easy" | "Medium" | "Hard",
				subject: formData.subject.trim() || undefined,
				gradeLevel: formData.gradeLevel.trim() || undefined,
				isPublic: formData.isPublic,
				tags: formData.tags.length > 0 ? formData.tags : undefined,
			};

			const problemId = await createProblem(problemData);

			if (onSave) {
				onSave(problemId);
			}
		} catch (error) {
			setErrors({
				submit:
					error instanceof Error ? error.message : "Failed to save problem",
			});
		} finally {
			setIsSaving(false);
		}
	};

	const addStep = () => {
		setFormData((prev) => ({
			...prev,
			solutionSteps: [...prev.solutionSteps, ""],
		}));
	};

	const removeStep = (index: number) => {
		if (formData.solutionSteps.length > 1) {
			setFormData((prev) => ({
				...prev,
				solutionSteps: prev.solutionSteps.filter((_, i) => i !== index),
			}));
		}
	};

	const updateStep = (index: number, value: string) => {
		setFormData((prev) => ({
			...prev,
			solutionSteps: prev.solutionSteps.map((step, i) =>
				i === index ? value : step,
			),
		}));
	};

	const moveStep = (index: number, direction: "up" | "down") => {
		if (
			(direction === "up" && index === 0) ||
			(direction === "down" && index === formData.solutionSteps.length - 1)
		) {
			return;
		}

		const newIndex = direction === "up" ? index - 1 : index + 1;
		const newSteps = [...formData.solutionSteps];
		[newSteps[index], newSteps[newIndex]] = [
			newSteps[newIndex],
			newSteps[index],
		];

		setFormData((prev) => ({ ...prev, solutionSteps: newSteps }));
	};

	const addTag = () => {
		if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
			setFormData((prev) => ({
				...prev,
				tags: [...prev.tags, currentTag.trim()],
			}));
			setCurrentTag("");
		}
	};

	const removeTag = (tagToRemove: string) => {
		setFormData((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	};

	const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
		if (e.key === "Enter") {
			e.preventDefault();
			action();
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">Create Math Problem</h1>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setShowPreview(!showPreview)}
					>
						<Eye className="w-4 h-4 mr-2" />
						{showPreview ? "Hide Preview" : "Show Preview"}
					</Button>
					{onCancel && (
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Form */}
				<Card>
					<CardHeader>
						<CardTitle>Problem Details</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Problem Statement */}
							<div>
								<Label htmlFor="problemStatement">Problem Statement *</Label>
								<Textarea
									id="problemStatement"
									placeholder="e.g., Solve for x: 3x + 5 = 14"
									value={formData.problemStatement}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											problemStatement: e.target.value,
										}))
									}
									className={errors.problemStatement ? "border-red-500" : ""}
								/>
								{errors.problemStatement && (
									<p className="text-red-500 text-sm mt-1">
										{errors.problemStatement}
									</p>
								)}
							</div>

							{/* Problem Type */}
							<div>
								<Label htmlFor="problemType">Problem Type *</Label>
								<Select
									value={formData.problemType}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											problemType: value as
												| "SOLVE_EQUATION"
												| "SIMPLIFY_EXPRESSION",
										}))
									}
								>
									<SelectTrigger
										className={errors.problemType ? "border-red-500" : ""}
									>
										<SelectValue placeholder="Select problem type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="SOLVE_EQUATION">
											Solve Equation
										</SelectItem>
										<SelectItem value="SIMPLIFY_EXPRESSION">
											Simplify Expression
										</SelectItem>
									</SelectContent>
								</Select>
								{errors.problemType && (
									<p className="text-red-500 text-sm mt-1">
										{errors.problemType}
									</p>
								)}
							</div>

							{/* Solution Steps */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<Label>Solution Steps *</Label>
									<Button type="button" size="sm" onClick={addStep}>
										<Plus className="w-4 h-4 mr-1" />
										Add Step
									</Button>
								</div>

								<div className="space-y-2">
									{formData.solutionSteps.map((step, index) => (
										<div
											key={`step-${index}`}
											className="flex items-center gap-2"
										>
											<span className="text-sm text-gray-500 min-w-8">
												{index + 1}.
											</span>
											<Input
												ref={(el) => {
													stepRefs.current[index] = el;
												}}
												placeholder={`Step ${index + 1}`}
												value={step}
												onChange={(e) => updateStep(index, e.target.value)}
												onKeyPress={(e) => {
													if (
														e.key === "Enter" &&
														index === formData.solutionSteps.length - 1
													) {
														addStep();
													}
												}}
												className="flex-1"
											/>
											<div className="flex gap-1">
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => moveStep(index, "up")}
													disabled={index === 0}
												>
													<ArrowUp className="w-3 h-3" />
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => moveStep(index, "down")}
													disabled={index === formData.solutionSteps.length - 1}
												>
													<ArrowDown className="w-3 h-3" />
												</Button>
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => removeStep(index)}
													disabled={formData.solutionSteps.length === 1}
												>
													<X className="w-3 h-3" />
												</Button>
											</div>
										</div>
									))}
								</div>
								{errors.solutionSteps && (
									<p className="text-red-500 text-sm mt-1">
										{errors.solutionSteps}
									</p>
								)}
							</div>

							{/* Metadata */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<Label htmlFor="title">Title</Label>
									<Input
										id="title"
										placeholder="Optional friendly title"
										value={formData.title}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												title: e.target.value,
											}))
										}
									/>
								</div>

								<div>
									<Label htmlFor="difficulty">Difficulty *</Label>
									<Select
										value={formData.difficulty}
										onValueChange={(value) =>
											setFormData((prev) => ({
												...prev,
												difficulty: value as "Easy" | "Medium" | "Hard",
											}))
										}
									>
										<SelectTrigger
											className={errors.difficulty ? "border-red-500" : ""}
										>
											<SelectValue placeholder="Select difficulty" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Easy">Easy</SelectItem>
											<SelectItem value="Medium">Medium</SelectItem>
											<SelectItem value="Hard">Hard</SelectItem>
										</SelectContent>
									</Select>
									{errors.difficulty && (
										<p className="text-red-500 text-sm mt-1">
											{errors.difficulty}
										</p>
									)}
								</div>

								<div>
									<Label htmlFor="subject">Subject</Label>
									<Input
										id="subject"
										placeholder="e.g., Algebra, Geometry"
										value={formData.subject}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												subject: e.target.value,
											}))
										}
									/>
								</div>

								<div>
									<Label htmlFor="gradeLevel">Grade Level</Label>
									<Input
										id="gradeLevel"
										placeholder="e.g., Grade 9, High School"
										value={formData.gradeLevel}
										onChange={(e) =>
											setFormData((prev) => ({
												...prev,
												gradeLevel: e.target.value,
											}))
										}
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									placeholder="Optional description for the problem"
									value={formData.description}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
								/>
							</div>

							{/* Tags */}
							<div>
								<Label>Tags</Label>
								<div className="flex gap-2 mb-2">
									<Input
										placeholder="Add tag"
										value={currentTag}
										onChange={(e) => setCurrentTag(e.target.value)}
										onKeyPress={(e) => handleKeyPress(e, addTag)}
										className="flex-1"
									/>
									<Button type="button" onClick={addTag}>
										Add
									</Button>
								</div>
								<div className="flex flex-wrap gap-2">
									{formData.tags.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="flex items-center gap-1"
										>
											{tag}
											<button
												type="button"
												onClick={() => removeTag(tag)}
												className="ml-1 hover:text-red-500"
											>
												<X className="w-3 h-3" />
											</button>
										</Badge>
									))}
								</div>
							</div>

							{/* Public Toggle */}
							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="isPublic"
									checked={formData.isPublic}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											isPublic: e.target.checked,
										}))
									}
								/>
								<Label htmlFor="isPublic">
									Make this problem public (others can see and use it)
								</Label>
							</div>

							{/* Error Display */}
							{errors.submit && (
								<Alert>
									<AlertCircle className="h-4 w-4" />
									<AlertDescription>{errors.submit}</AlertDescription>
								</Alert>
							)}

							{/* Submit Button */}
							<Button type="submit" disabled={isSaving} className="w-full">
								<Save className="w-4 h-4 mr-2" />
								{isSaving ? "Saving..." : "Save Problem"}
							</Button>
						</form>
					</CardContent>
				</Card>

				{/* Preview */}
				{showPreview && (
					<Card>
						<CardHeader>
							<CardTitle>Preview</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div>
									<h3 className="font-semibold text-lg">
										{formData.title || "Untitled Problem"}
									</h3>
									{formData.description && (
										<p className="text-gray-600 text-sm mt-1">
											{formData.description}
										</p>
									)}
								</div>

								<div className="flex gap-2 flex-wrap">
									{formData.problemType && (
										<Badge variant="outline">
											{formData.problemType.replace("_", " ")}
										</Badge>
									)}
									{formData.difficulty && (
										<Badge variant="outline">{formData.difficulty}</Badge>
									)}
									{formData.subject && (
										<Badge variant="outline">{formData.subject}</Badge>
									)}
									{formData.gradeLevel && (
										<Badge variant="outline">{formData.gradeLevel}</Badge>
									)}
								</div>

								<div>
									<h4 className="font-medium mb-2">Problem Statement:</h4>
									<p className="bg-gray-50 p-3 rounded border">
										{formData.problemStatement ||
											"No problem statement entered"}
									</p>
								</div>

								<div>
									<h4 className="font-medium mb-2">Solution Steps:</h4>
									<ol className="space-y-2">
										{formData.solutionSteps
											.filter((step) => step.trim())
											.map((step, index) => (
												<li
													key={`preview-step-${index}`}
													className="flex items-center gap-2"
												>
													<span className="text-sm text-gray-500 min-w-6">
														{index + 1}.
													</span>
													<span className="bg-gray-50 p-2 rounded border flex-1">
														{step}
													</span>
												</li>
											))}
									</ol>
									{formData.solutionSteps.filter((step) => step.trim())
										.length === 0 && (
										<p className="text-gray-500 italic">
											No solution steps entered
										</p>
									)}
								</div>

								{formData.tags.length > 0 && (
									<div>
										<h4 className="font-medium mb-2">Tags:</h4>
										<div className="flex flex-wrap gap-2">
											{formData.tags.map((tag) => (
												<Badge key={`preview-${tag}`} variant="secondary">
													{tag}
												</Badge>
											))}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
