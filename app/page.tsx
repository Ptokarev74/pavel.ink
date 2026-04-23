import AsciiText from "@/components/AsciiText";
import AsciiStars from "@/components/AsciiStars";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Layer 1: Background Stars (Black background) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AsciiStars />
      </div>

      {/* Layer 2: Pavel Text (Transparent background so stars show through) */}
      {/* This layer captures the mouse movement for the text rotation */}
      <div className="absolute inset-0 z-10">
        <AsciiText />
      </div>

      {/* Layer 3: Foreground HTML Content */}
      {/* pointer-events-none ensures you can still interact with the 3D scene below */}
      <div className="relative z-20 flex flex-col items-center pt-8 pointer-events-none w-full h-full">
        {/* Put pointer-events-auto on any text/buttons you want to be clickable or selectable */}
        <div className="pointer-events-auto flex flex-col items-center mt-32 text-white">
          <h1 className="text-5xl font-bold tracking-widest mb-4">HELLO WORLD</h1>
          <p className="text-xl text-gray-300">You can write normal text right here!</p>
        </div>
      </div>
    </main>
  );
}
