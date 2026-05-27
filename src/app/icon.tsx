import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#111111',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          BA
        </span>
      </div>
    ),
    { ...size }
  );
}
