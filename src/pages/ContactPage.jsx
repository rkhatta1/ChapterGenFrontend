import React from "react";
import { Github, Instagram, Twitter, Linkedin, Mail } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const socialLinks = [
  { icon: <Github />, href: "https://github.com/rkhatta1", label: "GitHub" },
  { icon: <Instagram />, href: "https://www.instagram.com/raajveerkhattar/", label: "Instagram" },
  { icon: <Twitter />, href: "https://x.com/raajveerkhattar", label: "Twitter" },
  { icon: <Linkedin />, href: "https://www.linkedin.com/in/raajveer-khattar/", label: "LinkedIn" },
  { icon: <Mail />, href: "mailto:khattarraajveer@gmail.com", label: "Email" },
];

const faqItems = [
  {
    question: "What is ChapGen?",
    answer: "ChapGen is an AI-powered tool that automatically generates semantic chapters for your YouTube videos, making them easier for your audience to navigate.",
  },
  {
    question: "How does it work?",
    answer: "It uses OpenAI's Whisper for accurate audio transcription and Google's Gemini API to understand the content and create relevant chapter titles and timestamps.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we use Google OAuth for authentication, and your video data is only used for the purpose of generating chapters. We do not store your video content.",
  },
  {
    question: "What is the 'Automated' vs. 'Manual' workflow?",
    answer: "The 'Automated' workflow automatically finds your latest YouTube video and generates chapters for it. The 'Manual' workflow allows you to provide a URL for any specific video you want to process.",
  },
];

export default function ContactPage() {
  return (
    <div className="flex flex-col max-w-full 2xl:max-w-[55%] mx-auto items-start p-6">
      <h2 className="text-2xl font-bold text-cyan-900 mb-4">Socials</h2>
      <div className="bg-white w-full border rounded-lg p-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {socialLinks.map((link, index) => (
            <a
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              {link.icon}
              <span className="font-medium">{link.label}</span>
            </a>
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-cyan-900 mb-4">Frequently Asked Questions</h2>
      <div className="bg-white w-full border rounded-lg p-6">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index}`} key={index}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
