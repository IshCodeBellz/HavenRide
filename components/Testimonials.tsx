import CenteredContainer from "@/components/CenteredContainer";

const testimonials = [
  {
    name: "Sarah",
    quote:
      '"The drivers are so thoughtful. I finally feel confident getting around the city."',
    rating: 5,
  },
  {
    name: "James",
    quote:
      '"Booking a wheelchair-friendly ride is effortless and always on time."',
    rating: 5,
  },
  {
    name: "Rebecca",
    quote:
      '"Reliable, kind, and affordable. It\'s a service I recommend to everyone."',
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section className="w-full bg-white py-20 lg:py-28">
      <CenteredContainer>
        <div className="mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#263238] mb-4">
            What our riders say
          </h2>
          <p className="text-base sm:text-lg text-neutral-600">
            Real voices from the HavenRide community.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {testimonials.map(({ name, quote, rating }) => (
            <div key={name} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: rating }).map((_, idx) => (
                  <span key={idx} className="rating-star">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-neutral-700 leading-relaxed mb-6 italic">
                {quote}
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#DAAAB2]/20 border border-[#DAAAB2]/40" />
                <span className="text-sm font-semibold text-[#263238]">
                  {name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CenteredContainer>
    </section>
  );
}
