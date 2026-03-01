import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Flag, Lock, Search, Code, ChevronRight, Brain } from "lucide-react";
import AnimatedGrid from "@/components/AnimatedGrid";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-primary selection:bg-primary selection:text-black font-sans">
      <AnimatedGrid />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-black/50 backdrop-blur-md border-b border-primary/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm">
            <Brain className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">Geminathon-CTF</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[10px] font-bold tracking-[0.2em] uppercase">
          <a href="#about" className="hover:text-white transition-colors">About</a>
          <a href="#challenges" className="hover:text-white transition-colors">Challenges</a>
          <a href="#rules" className="hover:text-white transition-colors">Rules</a>
          <button
            onClick={() => navigate("/dashboard")}
            className="border border-primary px-4 py-2 hover:bg-primary hover:text-black transition-all"
          >
            Enter Arena
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 px-8">
        <div className="max-w-7xl mx-auto">
          <section className="mb-24">
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-6xl md:text-8xl font-black leading-none tracking-tighter mb-8"
            >
              THINK. BREAK.<br />
              CAPTURE THE FLAG.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="max-w-xl text-xs md:text-sm tracking-widest leading-relaxed text-primary/80 mb-12 uppercase"
            >
              Join Geminathon-CTF — a timed Capture The Flag competition. Crack challenges, capture flags, and climb the leaderboard.
            </motion.p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-primary text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors"
              >
                Enter Arena
              </button>
              <button
                onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
                className="border border-primary/30 px-8 py-4 text-xs font-bold uppercase tracking-widest hover:border-primary transition-colors"
              >
                About Geminathon-CTF
              </button>
            </div>
          </section>

          {/* Globe Visualization */}
          <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <img
                src="/cyber_globe_yellow_1772395672788.png"
                alt="CTF Arena"
                className="w-full max-w-4xl opacity-60 mix-blend-screen"
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none" />
          </section>

          {/* Feature Cards - CTF Categories */}
          <section id="challenges" className="grid md:grid-cols-3 gap-1 mb-32 border-t border-primary/10">
            {[
              {
                icon: Code,
                title: "Web & Pwn",
                desc: "Exploit vulnerabilities, bypass protections, and capture flags in web and binary challenges."
              },
              {
                icon: Lock,
                title: "Crypto & Forensics",
                desc: "Decipher encodings, crack ciphers, and dig through artifacts to recover hidden flags."
              },
              {
                icon: Search,
                title: "Reversing & Misc",
                desc: "Reverse engineer binaries, solve puzzles, and think outside the box to find the flag."
              }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="border-r border-b border-primary/10 p-8 hover:bg-primary/5 transition-colors group"
              >
                <f.icon className="w-6 h-6 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-sm font-bold uppercase tracking-widest mb-4">{f.title}</h3>
                <p className="text-[10px] tracking-wider leading-relaxed text-primary/60">{f.desc}</p>
              </motion.div>
            ))}
          </section>

          {/* About Section */}
          <section id="about" className="mb-32">
            <div className="text-[10px] font-bold tracking-[0.3em] uppercase mb-8 flex items-center gap-2">
              <span className="w-8 h-[1px] bg-primary"></span>
              About Geminathon-CTF
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold tracking-tighter max-w-4xl"
            >
              A TIMED CAPTURE THE FLAG COMPETITION WHERE YOU SOLVE CHALLENGES, SUBMIT FLAGS, AND RACE TO THE TOP OF THE LEADERBOARD.
            </motion.h2>
          </section>

          {/* Mission / Vision Section - CTF themed */}
          <section id="rules" className="grid md:grid-cols-2 gap-px bg-primary/10 mb-32">
            {[
              {
                title: "Mission",
                text: "Geminathon-CTF brings together participants to test their skills in security, cryptography, and problem-solving. Our mission is to create an intense, fair, and fun CTF experience that rewards creativity and technical prowess."
              },
              {
                title: "Vision",
                text: "We envision a community where every participant can learn, compete, and capture flags. Whether you're new to CTFs or a seasoned player, Geminathon-CTF is your arena to think, break, and capture."
              }
            ].map((item, i) => (
              <div key={item.title} className="bg-black p-12 relative group overflow-hidden">
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <AnimatedGrid />
                </div>
                <h4 className="text-xl font-bold uppercase tracking-[0.2em] mb-12 flex items-center gap-2">
                  <span className="text-primary/40">/</span> {item.title}
                </h4>
                <p className="text-[10px] tracking-widest leading-loose text-primary/70 uppercase">
                  {item.text}
                </p>
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* Footer / Floating Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-8 py-4 bg-black/80 backdrop-blur-xl border-t border-primary/10">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex gap-4 text-[8px] font-bold tracking-[0.3em] uppercase opacity-40">
            <span>Think</span>
            <span>Break</span>
            <span>Capture</span>
            <span>Win</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/leaderboard")}
              className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase border border-primary/20 px-4 py-2 hover:bg-primary hover:text-black transition-all"
            >
              <ChevronRight className="w-3 h-3 rotate-[-45deg]" /> Leaderboard
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-primary/10 border border-primary/40 px-4 py-2 hover:bg-primary hover:text-black transition-all"
            >
              Enter Arena <Flag className="w-3 h-3" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
