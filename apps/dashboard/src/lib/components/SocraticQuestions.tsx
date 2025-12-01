"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const COMPLIANCE_TEXT = "Try it free for a full 7 days! If you love it, do nothing—you will automatically be charged $297 per seat on that date and every month thereafter until you cancel. Cancel auto-renewing charges by logging into your account under \"billing settings\" before your billing date. Cancel for any reason without having to talk to a human.";

const QUESTIONS = [
  "Do you agree that a lead is never \"hotter\" than the moment they're on your website?",
  "Are people more likely to buy from a human they can see than a faceless webpage?",
  "Would you rather talk to a hot lead right now than chase a phone number later?",
  "Don't you agree that nobody likes filling out forms and waiting for callbacks?",
  "Isn't it crazy to pay for traffic and then hide your salespeople behind a form—when instead they could video chat with prospects even if they don't opt in?",
];

export function SocraticQuestions() {
  // Socratic questions state - tracks "yes" | "no" | null for each question
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, "yes" | "no" | null>>({});
  
  const answerQuestion = (idx: number, answer: "yes" | "no") => {
    setQuestionAnswers(prev => ({
      ...prev,
      [idx]: prev[idx] === answer ? null : answer
    }));
  };
  
  const answeredCount = Object.values(questionAnswers).filter(v => v !== null).length;
  const yesCount = Object.values(questionAnswers).filter(v => v === "yes").length;

  return (
    <>
      <div className="space-y-4">
        {QUESTIONS.map((question, idx) => {
          const answer = questionAnswers[idx];
          const isAnswered = answer !== null && answer !== undefined;
          
          // Find the first unanswered question
          const firstUnansweredIdx = [0, 1, 2, 3, 4].find(i => 
            questionAnswers[i] === null || questionAnswers[i] === undefined
          );
          const isActiveQuestion = idx === firstUnansweredIdx;
          const isPastQuestion = firstUnansweredIdx !== undefined && idx > firstUnansweredIdx;
          
          return (
            <div
              key={idx}
              className={`relative bg-muted/20 border rounded-xl p-5 transition-colors duration-500 ${
                isAnswered
                  ? 'border-primary/50 bg-primary/5' 
                  : isActiveQuestion
                    ? 'border-primary/70 bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-border/30 opacity-50'
              }`}
              style={{
                transform: isPastQuestion && !isAnswered ? 'scale(0.98)' : 'scale(1)',
              }}
            >
              {/* Pulse ring for active question */}
              {isActiveQuestion && !isAnswered && (
                <div className="absolute -inset-[2px] rounded-xl border-2 border-primary/50 animate-ping opacity-30" />
              )}
              
              <p className={`text-lg leading-relaxed mb-4 transition-colors duration-300 ${
                isAnswered ? 'text-white' : isActiveQuestion ? 'text-white' : 'text-muted-foreground'
              }`}>
                {question}
              </p>
              
              {/* Yes / No checkboxes */}
              <div className={`flex items-center gap-6 transition-opacity duration-300 ${
                !isActiveQuestion && !isAnswered ? 'opacity-50' : 'opacity-100'
              }`}>
                {/* Yes */}
                <button
                  onClick={() => answerQuestion(idx, "yes")}
                  className={`flex items-center gap-2 group ${isActiveQuestion && !isAnswered ? 'animate-pulse' : ''}`}
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-transform duration-300 ${
                    answer === "yes"
                      ? 'bg-primary border-primary scale-110' 
                      : isActiveQuestion
                        ? 'border-primary/70 group-hover:border-primary group-hover:bg-primary/20'
                        : 'border-slate-500 group-hover:border-primary/70'
                  }`}>
                    <Check className={`w-4 h-4 text-white transition-opacity duration-300 ${
                      answer === "yes"
                        ? 'opacity-100 scale-100' 
                        : 'opacity-0 scale-0'
                    }`} />
                  </div>
                  <span className={`font-medium transition-colors duration-300 ${
                    answer === "yes" 
                      ? 'text-primary' 
                      : isActiveQuestion 
                        ? 'text-primary/80 group-hover:text-primary'
                        : 'text-muted-foreground group-hover:text-white'
                  }`}>Yes</span>
                </button>
                
                {/* No */}
                <button
                  onClick={() => answerQuestion(idx, "no")}
                  className="flex items-center gap-2 group"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-transform duration-300 ${
                    answer === "no"
                      ? 'bg-slate-500 border-slate-500 scale-110' 
                      : 'border-slate-500 group-hover:border-slate-400'
                  }`}>
                    <Check className={`w-4 h-4 text-white transition-opacity duration-300 ${
                      answer === "no"
                        ? 'opacity-100 scale-100' 
                        : 'opacity-0 scale-0'
                    }`} />
                  </div>
                  <span className={`font-medium transition-colors duration-300 ${
                    answer === "no" ? 'text-slate-400' : 'text-muted-foreground group-hover:text-white'
                  }`}>No</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/50">
          <span className="text-sm text-muted-foreground">
            {answeredCount === 0 ? (
              "Check yes or no ✓"
            ) : answeredCount === 5 ? (
              yesCount >= 4 ? (
                <span className="text-primary font-semibold">You know what to do 👇</span>
              ) : (
                <span className="text-muted-foreground">Interesting... 🤔</span>
              )
            ) : (
              <><span className="text-primary font-semibold">{answeredCount}/5</span> answered</>
            )}
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xl font-semibold text-white mb-6">
          If this widget catches just <span className="text-primary">one client</span> this month who would have otherwise clicked the &ldquo;Back&rdquo; button, has the software paid for itself?
        </p>
        <div className="flex flex-col items-center">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-colors hover:shadow-xl hover:shadow-primary/30"
          >
            Start Free 7-Day Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-xs text-muted-foreground mt-3 max-w-md text-center leading-relaxed">
            {COMPLIANCE_TEXT}
          </p>
        </div>
      </div>
    </>
  );
}

