import React, { useState, useEffect, useRef } from "react";

const TTSButton = ({ botResponse, autoPlay, userInteracted }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    const playAudio = async () => {
      if (!audio && botResponse && userInteracted && autoPlay) {
        await startSpeech();
      }
    };
    playAudio();

    // This will remove the event listener when the audio or the component unmounts
    return () => {
      if (audio) {
        audio.removeEventListener("ended", handleAudioEnded);
        audio.pause();
        URL.revokeObjectURL(audio.src);
      }
    };
  }, [audio, botResponse]);

  useEffect(() => {
    if (audio) {
      audio.addEventListener("ended", handleAudioEnded);
    }
  }, [audio]);

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const startSpeech = async () => {
    if (isPlaying || !botResponse) return;

    setIsPlaying(true);
    // Initialise a new AbortController
    const controller = new AbortController();
    const { signal } = controller;
    // Store the controller in the ref
    abortControllerRef.current = controller;

    try {
      const response = await fetch("http://localhost:4242/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ msgText: botResponse }),
        signal, // Pass the abort signal to the fetch request
      });

      // Handle if the fetch was aborted
      if (signal.aborted) {
        console.log("Fetch aborted!");
        setIsPlaying(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const newAudio = new Audio(url);
      setAudio(newAudio);
      newAudio.play();
    } catch (e) {
      // Ignore the error if it's an abort error
      if (e.name !== "AbortError") {
        console.error(e);
      }
      setIsPlaying(false);
    }
  };

  const stopSpeech = () => {
    setIsPlaying(false);
    if (audio) {
      audio.pause();
    }
    // Abort any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      stopSpeech();
    } else {
      startSpeech();
    }
  };

  return (
    <div className="absolute -top-4">
      <div className="flex w-full items-center justify-center gap-2">
        <button
          className={`tts-button flex h-7 w-20 items-center rounded-full bg-backgroundColor2 px-3 text-sm font-light text-white ${
            isPlaying ? "ri-stop-fill" : "ri-volume-up-line"
          }`}
          onClick={toggleSpeech}
        >
          {isPlaying ? (
            <svg
              className="mx-auto"
              stroke="currentColor"
              width="1.5em"
              height="1.5em"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <rect
                  x="6"
                  y="4"
                  width="4"
                  height="16"
                  fill="currentColor"
                ></rect>
                <rect
                  x="14"
                  y="4"
                  width="4"
                  height="16"
                  fill="currentColor"
                ></rect>
              </g>
            </svg>
          ) : (
            <svg
              className="mx-auto"
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 448 512"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default TTSButton;
