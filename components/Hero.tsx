"use client";
import Link from "next/link";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import CenteredContainer from "@/components/CenteredContainer";

interface HeroProps {
  isSignedIn?: boolean;
}

export default function Hero({ isSignedIn }: HeroProps) {
  return (
    <section className="w-full bg-gray-50 py-20 lg:py-28">
      <CenteredContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-[#263238]">
              Accessible transport, made simple.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-neutral-600">
              Safe, affordable, and inclusive rides for everyone.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {isSignedIn ? (
                <Link
                  href="/rider"
                  className="inline-block bg-[#5C7E9B] text-white px-10 py-4 rounded-xl font-semibold hover:bg-[#5C7E9B]/90 transition-colors"
                >
                  Book a Ride
                </Link>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/auth-callback">
                  <button className="inline-block bg-[#5C7E9B] text-white px-10 py-4 rounded-xl font-semibold hover:bg-[#5C7E9B]/90 transition-colors">
                    Book a Ride
                  </button>
                </SignInButton>
              )}
              <Link
                href="#how-it-works"
                className="inline-block px-10 py-4 border-2 border-neutral-300 text-neutral-700 rounded-xl font-semibold hover:border-neutral-400 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
          {/* Right Illustration */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-2xl">
              <Image
                src="/images/van.png"
                alt="Accessible Van"
                width={700}
                height={700}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </CenteredContainer>
    </section>
  );
}
