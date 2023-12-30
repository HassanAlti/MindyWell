import React, { useState } from "react";

const TTSButton = ({ botResponse }) => {
  // State to track if the audio is playing
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);

  console.log(botResponse);

  const startSpeech = async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    // Fetch the speech audio from the server
    try {
      const response = await fetch("http://localhost/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ msgText: botResponse }),
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audioObj = new Audio(url);
      audioObj.addEventListener("ended", () => {
        setIsPlaying(false);
      });

      setAudio(audioObj);
      audioObj.play();
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const stopSpeech = () => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="absolute -top-4">
      <div className="flex w-full items-center justify-center gap-2">
        <button
          className={`tts-button tts-button flex h-7 w-20 items-center rounded-full bg-backgroundColor2 px-3 text-sm font-light text-white ${
            isPlaying ? "ri-stop-fill" : "ri-volume-up-line"
          }`}
          onClick={() => {
            if (isPlaying) {
              stopSpeech();
            } else {
              // For this example, assume 'someTextToSpeak' is available
              startSpeech();
            }
          }}
        >
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
          <audio></audio>
        </button>
      </div>
    </div>
  );
};

export default TTSButton;
