"use client";

import React, { useState } from "react";
import {
  Briefcase as BriefcaseIcon,
  FileText,
  MessageSquare,
  Building2,
  Copy,
  CheckCircle,
  Loader2,
  Upload,
  X,
  Search,
} from "lucide-react";

interface Results {
  resume: string | null;
  interview: string | null;
  company: string | null;
}

interface CopiedStates {
  [key: string]: boolean;
}

const JobPrepCompanion = () => {
  const [jobDescription, setJobDescription] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"resume" | "interview" | "company">("resume");
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<Results>({
    resume: null,
    interview: null,
    company: null,
  });
  const [copiedStates, setCopiedStates] = useState<CopiedStates>({});

  const copyToClipboard = async (text: string, id: string | number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates((prev) => ({ ...prev, [id]: true }));
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);

    try {
      if (file.type === "application/pdf") {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        setResumeText(base64Data);
      } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        alert("Please upload a PDF or TXT file");
        setResumeFile(null);
        setResumeText("");
      }
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file. Please try again.");
      setResumeFile(null);
      setResumeText("");
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setResumeText("");
    const input = document.getElementById("resume-upload") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const formatTextOutput = (text: string) => {
    if (!text) return "";

    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>");
  };

  const generateContent = async () => {
    if (!jobDescription.trim()) {
      alert("Please paste a job description first");
      return;
    }

    if (!companyName.trim()) {
      alert("Please enter the company name for research");
      return;
    }

    setLoading(true);
    setResults({ resume: null, interview: null, company: null });

    try {
      let resumeContext = "";
      if (resumeText) {
        if (resumeFile?.type === "application/pdf") {
          resumeContext = `\n\nCandidate's Current Resume (PDF content):\n[Resume will be analyzed from uploaded PDF]`;
        } else {
          resumeContext = `\n\nCandidate's Current Resume:\n${resumeText}`;
        }
      }

      const resumePrompt = `You are an expert resume coach... (same as before)`;

      const interviewPrompt = `You are an experienced hiring manager... (same as before)`;

      let companySearchResults = "";
      try {
        const searchResponse = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: `${companyName} company mission products news` }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          companySearchResults = searchData.results
            ? searchData.results.slice(0, 3).map((r: any) => `${r.title}: ${r.snippet}`).join("\n")
            : "";
        }
      } catch {
        console.log("Search not available, using AI knowledge");
      }

      const companyPrompt = `You are a career coach... (same as before)`;

      // Resume call
      const resumeResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: resumePrompt, max_tokens: 1000 }),
      });
      const resumeData = await resumeResponse.json();

      // Interview call
      const interviewResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: interviewPrompt, max_tokens: 1500 }),
      });
      const interviewData = await interviewResponse.json();

      // Company call
      const companyResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: companyPrompt, max_tokens: 1200 }),
      });
      const companyData = await companyResponse.json();

      setResults({
        resume: resumeData.text,
        interview: interviewData.text,
        company: companyData.text,
      });
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "resume", label: "Resume Bullets", icon: FileText },
    { id: "interview", label: "Interview Prep", icon: MessageSquare },
    { id: "company", label: "Company Intel", icon: Building2 },
  ] as const;

  return (
    // ... JSX same as before
  );
};

export default JobPrepCompanion;
