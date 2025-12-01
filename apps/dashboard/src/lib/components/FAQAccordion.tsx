"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// ===== FAQ DATA =====
const faqs = [
  {
    question: "Who is this for?",
    answer: "GreetNow is built for businesses selling high-ticket services—where one conversation can be worth $5K, $10K, or $50K+. Coaches, consultants, professional services, home services, agencies. If your business model depends on getting people on calls, this changes everything.",
  },
  {
    question: "We're not awake 24/7. How do I staff this?",
    answer: "The widget only appears when your agents are marked as available. When no one's online, visitors see your regular site—no one is ever disappointed by an empty widget. You set the hours, assign the team, and it handles the rest.",
  },
  {
    question: "I don't want my closers wasting time on tire-kickers.",
    answer: "Put the widget only on high-intent pages (pricing, services, contact). Block countries you don't serve. Think about it: when a bad lead fills out a form, you still waste time qualifying them. This way, you find out faster—and often the BEST leads are the ones who never wanted to give out their phone number anyway.",
  },
  {
    question: "Won't this scare away introverts? They have to be on camera?",
    answer: "No! Your visitors DON'T have to turn on their camera. They see and hear YOU first (building trust), then simply click 'Unmute' to talk back. Their camera stays off unless THEY choose to turn it on. It's an invitation, not an ambush.",
  },
  {
    question: "We already use a chatbot. Isn't that enough?",
    answer: "Chatbots are for support: 'Where's my order?' Video is for sales: 'Here's my credit card.' Text chat is low-trust, low-conversion. When prospects see an actual human face, you become real, trustworthy, memorable. High-ticket sales require high trust. Video builds it instantly.",
  },
  {
    question: "What if I install this and nobody clicks it?",
    answer: "Even if visitors don't click, seeing a live human on screen proves you're real, open, and not a scam. It acts as a trust signal—visitors know there's a real person behind the website. But here's the thing: when you put a greeter at the door, people engage. That's just human nature.",
  },
  {
    question: "This sounds technically complicated.",
    answer: "It's easier than installing a Facebook Pixel. Copy one line of code. Paste it. You're live. Works with WordPress, ClickFunnels, GoHighLevel, Webflow, and everything else. Setup time: 60 seconds. No developers needed.",
  },
  {
    question: "What if it doesn't work for my business?",
    answer: "Start your free 7-day trial. If it's not booking more appointments than relying on the old way, cancel with one click in your dashboard—no phone calls, no guilt trips, no hostage situations. If it doesn't pay for itself, we don't want your money.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`border border-border/50 rounded-xl overflow-hidden transition-colors duration-300 ${
        isOpen ? "bg-primary/5" : "bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <button
        onClick={onClick}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-lg">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ${
          isOpen ? "max-h-96 pb-5 px-6" : "max-h-0"
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

export function FAQAccordion() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <FAQItem
          key={index}
          question={faq.question}
          answer={faq.answer}
          isOpen={openFaq === index}
          onClick={() => setOpenFaq(openFaq === index ? null : index)}
        />
      ))}
    </div>
  );
}

