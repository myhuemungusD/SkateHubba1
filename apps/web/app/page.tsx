import Link from "next/link";
import AuthButton from "./components/AuthButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <AuthButton />
      </div>

      <main className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-6xl font-bold text-[#39FF14] tracking-tighter">
          SKATEHUBBA
        </h1>
        <p className="text-xl text-gray-400 max-w-md">
          The ultimate game of S.K.A.T.E. on the blockchain. Challenge friends, mint clips, and own your tricks.
        </p>
        
        <div className="flex gap-4 mt-8">
          <Link 
            href="/skate/create"
            className="bg-[#FF5F1F] hover:bg-[#ff7f4d] text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            START GAME
          </Link>
          <Link 
            href="/skate/join" // Placeholder for join flow
            className="border border-[#333] hover:border-[#39FF14] text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg"
          >
            JOIN GAME
          </Link>
        </div>
      </main>
      
      <footer className="absolute bottom-8 text-gray-600 text-sm">
        <p>Powered by Zora & Firebase</p>
      </footer>
    </div>
  );
}
