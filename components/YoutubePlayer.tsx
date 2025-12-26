import React, { useEffect, useRef } from 'react';

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

interface Props {
  url: string;
}

const YoutubePlayer: React.FC<Props> = ({ url }) => {
  const videoId = getYoutubeId(url);
  
  if (!videoId) return null;

  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;

  return (
    <div className="absolute top-[-9999px] left-[-9999px] invisible">
      <iframe 
        width="0" 
        height="0" 
        src={src} 
        frameBorder="0" 
        allow="autoplay; encrypted-media" 
        allowFullScreen 
        title="bgm-player"
      />
    </div>
  );
};

export default React.memo(YoutubePlayer);
