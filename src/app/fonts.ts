import { Atkinson_Hyperlegible, Baloo_2, Comfortaa, Fredoka, Lexend, Nunito, Patrick_Hand, Quicksand } from "next/font/google";

export const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-fredoka", display: "swap" });
export const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
export const quicksand = Quicksand({ subsets: ["latin", "latin-ext"], variable: "--font-quicksand", display: "swap", preload: false });
export const baloo = Baloo_2({ subsets: ["latin", "latin-ext"], variable: "--font-baloo", display: "swap", preload: false });
export const comfortaa = Comfortaa({ subsets: ["latin", "latin-ext"], variable: "--font-comfortaa", display: "swap", preload: false });
export const atkinson = Atkinson_Hyperlegible({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap", preload: false });
export const patrick = Patrick_Hand({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-patrick", display: "swap", preload: false });
export const lexend = Lexend({ subsets: ["latin", "latin-ext"], variable: "--font-lexend", display: "swap", preload: false });

export const fontVariables = [fredoka, nunito, quicksand, baloo, comfortaa, atkinson, patrick, lexend].map((f) => f.variable).join(" ");
