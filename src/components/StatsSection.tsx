const stats = [
  { value: "5+", label: "CITIES" },
  { value: "3+", label: "YEARS IN BUSINESS" },
  { value: "50+", label: "PRODUCTS" },
  { value: "1,000+", label: "CUSTOMERS SERVED" },
];

const StatsSection = () => {
  return (
    <section className="py-14 bg-secondary/50">
      <div className="container mx-auto px-4 text-center">
        <p className="text-muted-foreground mb-1">RentEase By Numbers</p>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10">
          Growing Every Day
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl md:text-4xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-xs md:text-sm font-semibold text-muted-foreground tracking-wider mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
