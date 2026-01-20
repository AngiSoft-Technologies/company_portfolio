const Hero = ({ theme }) => {
  return (
    <section id='introduction' className="hero p-8 text-center flex flex-col justify-center items-center min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Welcome to</h2>
        <h1 className="name text-5xl md:text-7xl font-extrabold mb-6 bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
          AngiSoft Technologies
        </h1>
        <h3 className="mt-4 text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8">
          Professional Software Development & Digital Solutions
        </h3>
        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          We deliver cutting-edge software solutions, custom development, and digital transformation services 
          to help your business thrive in the digital age.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <a 
            href="#services" 
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              theme === 'dark' 
                ? 'bg-teal-600 hover:bg-teal-700 text-white' 
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            Our Services
          </a>
          <a 
            href="/book" 
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300'
            }`}
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;