import React, { useState, useEffect } from "react";
import "../tailwind.css";

const Suggest = ({ onSuggestionClick, currentChat }) => {
  const suggestions = [
    {
      prompt: "I'm stressed about",
      details: "money. Do you have any advice?",
    },
    {
      prompt: "What are some strategies to",
      details: "manage stress from school or college?",
    },
    {
      prompt: "Can you help me develop",
      details: "healthy daily habits?",
    },
    {
      prompt: "What should I do when I feel pressured by",
      details: "my friends?",
    },
    {
      prompt: "How can I stop procrastinating and",
      details: "start doing more?",
    },
    {
      prompt: "What are healthy ways to deal with",
      details: "anger?",
    },
    {
      prompt: "I'm going through a major life change. How can I",
      details: "cope better?",
    },
    {
      prompt: "How can I improve my",
      details: "emotional intelligence?",
    },
    {
      prompt: "I think I need professional help for",
      details: "depression. Where should I start?",
    },
    {
      prompt: "What should I do when I have a",
      details: "panic attack?",
    },
    {
      prompt: "I'm scared of social",
      details: "situations. How can I overcome this?",
    },
    {
      prompt: "I'm feeling burnt out",
      details: "at work. How can I cope with this?",
    },
    {
      prompt: "What can I do to feel",
      details: "less lonely?",
    },
    {
      prompt: "What are some habits for",
      details: "better sleep?",
    },
  ];

  const [randomSuggestions, setRandomSuggestions] = useState([]);

  useEffect(() => {
    // Generate four unique random indices
    const getRandomIndices = (num, max) => {
      const indices = new Set();
      while (indices.size < num) {
        const randomIndex = Math.floor(Math.random() * max);
        indices.add(randomIndex);
      }
      return Array.from(indices);
    };

    // Get random suggestions when currentChat changes
    const newRandomIndices = getRandomIndices(4, suggestions.length);
    const newRandomSuggestions = newRandomIndices.map(
      (index) => suggestions[index]
    );

    setRandomSuggestions(newRandomSuggestions);
  }, [currentChat]);

  const handleClick = (suggest) => {
    onSuggestionClick(`${suggest.prompt} ${suggest.details}`);
  };

  return (
    <div className="mt-70 my-8 md:p-0 p-4 mx-auto w-full md:w-[65%] grid gap-2 grid-cols-2">
      {randomSuggestions.map((suggest, index) => (
        <div
          key={index}
          className="flex flex-col items-start p-2 rounded-lg border border-gray-600 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleClick(suggest);
          }}
        >
          <p className="text-sm text-[#c5c5d2]">{suggest.prompt}</p>
          <p className="text-sm font-bold text-[#585757]">{suggest.details}</p>
        </div>
      ))}
    </div>
  );
};

export default Suggest;
