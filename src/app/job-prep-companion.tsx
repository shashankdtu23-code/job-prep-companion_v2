"use client";

import React, { useState } from 'react';
import { Briefcase as BriefcaseIcon, FileText, MessageSquare, Building2, Copy, CheckCircle, Loader2, Upload, X, Search } from 'lucide-react';

const JobPrepCompanion = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [activeTab, setActiveTab] = useState('resume');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    resume: null,
    interview: null,
    company: null
  });
  const [copiedStates, setCopiedStates] = useState({});

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setResumeFile(file);
    
    try {
      if (file.type === 'application/pdf') {
        // For PDF files, we'll read as base64 and let the AI extract text
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
        setResumeText(base64Data);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setResumeText(text);
      } else {
        alert('Please upload a PDF or TXT file');
        setResumeFile(null);
        setResumeText('');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please try again.');
      setResumeFile(null);
      setResumeText('');
    }
  };

  const removeFile = () => {
    setResumeFile(null);
    setResumeText('');
    document.getElementById('resume-upload').value = '';
  };

  const formatTextOutput = (text) => {
    if (!text) return '';
    
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italics
      .replace(/__(.*?)__/g, '<strong>$1</strong>') // Alternative bold
      .replace(/_(.*?)_/g, '<em>$1</em>'); // Alternative italics
  };

  const generateContent = async () => {
    if (!jobDescription.trim()) {
      alert('Please paste a job description first');
      return;
    }

    if (!companyName.trim()) {
      alert('Please enter the company name for research');
      return;
    }

    setLoading(true);
    setResults({ resume: null, interview: null, company: null });

    try {
      // Prepare resume context
      let resumeContext = '';
      if (resumeText) {
        if (resumeFile?.type === 'application/pdf') {
          resumeContext = `\n\nCandidate's Current Resume (PDF content):\n[Resume will be analyzed from uploaded PDF]`;
        } else {
          resumeContext = `\n\nCandidate's Current Resume:\n${resumeText}`;
        }
      }

      // Generate resume bullets with resume context
      const resumePrompt = `You are an expert resume coach. The user has provided a job description${resumeText ? ' and their current resume' : ''}.

Task: Suggest 4–6 resume bullet points tailored to this role.

Rules:
- Use **strong action verbs** (e.g., Led, Built, Optimized, Implemented, Drove).
- Make them **quantifiable** with realistic metrics (% growth, $ saved, # users impacted).
- Keep each bullet concise (max 2 lines).
- Ensure alignment with key JD requirements.
- Use **bold** for key achievements and *italics* for emphasis where appropriate.
- Format as a bulleted list.
${resumeText ? '- Consider the candidate\'s existing experience and suggest improvements or new angles based on their background.' : ''}

Job Description:
${jobDescription}${resumeContext}

${resumeText ? 'Focus on tailoring their existing experience to match the job requirements and suggest specific improvements.' : 'Create compelling bullet points that would be suitable for this role.'}

Provide only the bullet points with proper formatting, no additional commentary.`;

      // Generate interview Q&A with resume context
      const interviewPrompt = `You are an experienced hiring manager. Based on the given job description${resumeText ? ' and the candidate\'s resume' : ''}:

1. Generate 5 likely **behavioral interview questions**.
2. Generate 5 likely **role-specific technical/functional questions**.
3. Provide **sample STAR framework answers** for 2 behavioral questions.
${resumeText ? '4. Identify 2-3 potential questions about gaps or transitions in their resume.' : ''}

Format your response with **bold headers** and *italics* for emphasis:
**Behavioral Questions:**
[List of 5 questions]

**Technical/Role-Specific Questions:**
[List of 5 questions]

**Sample STAR Answers:**
[2 detailed sample answers using *Situation*, *Task*, *Action*, *Result* format]

${resumeText ? '**Resume-Specific Questions:**\n[2-3 questions about their background]\n' : ''}

Job Description:
${jobDescription}${resumeContext}

${resumeText ? 'Tailor questions to their specific background and experience level.' : ''}`;

      // Search for company information
      let companySearchResults = '';
      try {
        const searchResponse = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `${companyName} company mission products news` })
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          companySearchResults = searchData.results ? 
            searchData.results.slice(0, 3).map(r => `${r.title}: ${r.snippet}`).join('\n') : 
            '';
        }
      } catch (error) {
        console.log('Search not available, using AI knowledge');
      }

      // Generate company research with search results
      const companyPrompt = `You are a career coach. Provide a comprehensive company research summary for a candidate preparing for an interview.

${companySearchResults ? `Recent search results about ${companyName}:\n${companySearchResults}\n` : ''}

Include the following sections with **bold headers** and *italics* for key points:
**Company Overview:**
- Mission & values
- Products/services overview
- Company size and market position

**Recent Developments:**
- Recent news, initiatives, or changes
- Industry trends affecting the company

**Interview Talking Points:**
- 3-4 specific talking points the candidate can mention
- Questions they should ask about the company
- Ways to demonstrate knowledge of the company

Company: ${companyName}

Use the search results if available, otherwise use your knowledge. Format with proper emphasis using **bold** and *italics*.`;

      // Make API calls
      let apiCalls = [];
      
      // Resume bullets call
      const resumeResponse = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: resumePrompt,
    max_tokens: 1000
  }),
});

const resumeData = await resumeResponse.json();


      // Interview prep call
   const interviewResponse = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: interviewPrompt,
    max_tokens: 1500
  }),
});

const interviewData = await interviewResponse.json();

      // Company research call
     const companyResponse = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: companyPrompt,
    max_tokens: 1200
  }),
});

const companyData = await companyResponse.json();


    setResults({
  resume: resumeData.text,
  interview: interviewData.text,
  company: companyData.text,
});


    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'resume', label: 'Resume Bullets', icon: FileText },
    { id: 'interview', label: 'Interview Prep', icon: MessageSquare },
    { id: 'company', label: 'Company Intel', icon: Building2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BriefcaseIcon className="w-10 h-10 text-indigo-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">AI Job Prep Companion</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform any job description into personalized resume bullets, interview prep, and company research in seconds
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Job Description */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Job Description</h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Copy and paste the complete job description here..."
                className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-none text-gray-700"
              />
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Company Name *</h3>
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name for research"
                    className="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-700"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Required for accurate company research and intelligence
                </p>
              </div>
            </div>

            {/* Right Column - Resume Upload */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Current Resume (Optional)</h2>
              <p className="text-gray-600 mb-4">
                Upload your current resume for more personalized suggestions
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {!resumeFile ? (
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <label htmlFor="resume-upload" className="cursor-pointer">
                      <span className="text-indigo-600 font-medium hover:text-indigo-700">
                        Choose file
                      </span>
                      <span className="text-gray-500"> or drag and drop</span>
                    </label>
                    <p className="text-sm text-gray-500 mt-2">PDF or TXT files only</p>
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-800">{resumeFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(resumeFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Benefits of uploading your resume:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Tailored bullet points based on your experience</li>
                  <li>Interview questions specific to your background</li>
                  <li>Personalized preparation strategies</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={generateContent}
            disabled={loading || !jobDescription.trim() || !companyName.trim()}
            className="mt-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <BriefcaseIcon className="w-5 h-5" />
                Generate Job Prep Materials
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {(results.resume || results.interview || results.company) && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'border-b-2 border-indigo-500 text-indigo-600 bg-indigo-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-8">
              {activeTab === 'resume' && results.resume && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {resumeFile ? 'Personalized Resume Bullets' : 'Tailored Resume Bullets'}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(results.resume, 'resume')}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {copiedStates.resume ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div 
                        className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatTextOutput(results.resume) }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'interview' && results.interview && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">
                      {resumeFile ? 'Personalized Interview Prep' : 'Interview Preparation'}
                    </h3>
                    <button
                      onClick={() => copyToClipboard(results.interview, 'interview')}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {copiedStates.interview ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div 
                        className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatTextOutput(results.interview) }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'company' && results.company && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Company Research & Intelligence</h3>
                    <button
                      onClick={() => copyToClipboard(results.company, 'company')}
                      className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {copiedStates.company ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy All
                        </>
                      )}
                    </button>
                  </div>
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <div 
                        className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: formatTextOutput(results.company) }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyzing Job Description</h3>
            <p className="text-gray-600">
              {resumeFile ? 'Processing your resume and generating personalized content...' : 'Generating personalized resume bullets, interview questions, and company research...'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500">
          <p>Streamline your job search with AI-powered preparation tools</p>
        </div>
      </div>
    </div>
  );
};

export default JobPrepCompanion;