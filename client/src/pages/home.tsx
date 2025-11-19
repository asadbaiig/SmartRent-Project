import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PropertyCard } from "@/components/property-card";
import { useQuery } from "@tanstack/react-query";
import { DEMO_PROPERTIES } from "@/lib/demoData";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Bot, FileText, IdCard, Plus, Search, TrendingUp, Users, CheckCircle } from "lucide-react";
import { motion, useInView, animate } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

type AnimatedCounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  autoStart?: boolean;
  startDelay?: number;
};

function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
  autoStart = false,
  startDelay = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const controlsRef = useRef<any>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const shouldStart = autoStart || isInView;
    
    if (shouldStart && !hasAnimated && value > 0) {
      setHasAnimated(true);
      
      const timeout = setTimeout(() => {
        controlsRef.current = animate(0, value, {
          duration,
          ease: "easeOut",
          onUpdate: (latest) => {
            setDisplayValue(parseFloat(latest.toFixed(decimals)));
          },
          onComplete: () => {
            setDisplayValue(value); // Ensure final value is set
          }
        });
      }, startDelay);
      
      return () => {
        clearTimeout(timeout);
        if (controlsRef.current) {
          controlsRef.current.stop();
        }
      };
    }
  }, [autoStart, isInView, value, duration, decimals, hasAnimated, startDelay]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();

  // Fetch featured properties
  const { data: properties = [] } = useQuery({
    queryKey: ['/api/properties'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/properties?limit=6');
        if (!response.ok) {
          // On error, fall back to empty array to avoid crashing UI
          return [];
        }
        return await response.json();
      } catch {
        // Network or unexpected error - fall back gracefully
        return [];
      }
    },
  });

  return (
    <motion.div 
      className="min-h-screen bg-[#FFF5FF]/50 dark:bg-[#1a0f2e]"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.2 } },
      }}
    >
      {/* Hero Section */}
      <motion.section 
        className="bg-gradient-to-br from-[#FFF5FF] via-[#A187B0]/20 to-white dark:from-[#2a1a3f] dark:to-[#1a0f2e] py-16"
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={fadeInUp}>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground dark:text-white leading-tight">
                Pakistan's First <span className="text-primary-600 dark:text-accent">Blockchain-Powered</span> Rental Platform
              </h1>
              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Secure, transparent, and AI-driven property rentals. Create smart contracts, get fair pricing, and manage rentals with complete trust and legal compliance.
              </p>
              
              {/* Key Features */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Shield, text: "Blockchain Security" },
                  { icon: Bot, text: "AI Price Suggestions" },
                  { icon: FileText, text: "Smart Contracts" },
                  { icon: IdCard, text: "CNIC Verification" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                  <Icon className="text-white h-3 w-3" />
                </div>
                <span className="text-foreground/80 dark:text-gray-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild className="bg-gradient-primary hover:opacity-90 transition-opacity text-white" data-testid="button-list-property">
                  <Link href={user?.role === 'landlord' ? "/dashboard" : "/register"}>
                    <Plus className="mr-2 h-4 w-4" />
                    List Your Property
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-find-properties">
                  <Link href="/properties">
                    <Search className="mr-2 h-4 w-4" />
                    Find Properties
                  </Link>
                </Button>
              </div>
            </motion.div>

            {/* Hero Image */}
            <motion.div className="relative" variants={fadeInUp}>
              <img 
                src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1280" 
                alt="Modern Pakistani apartment buildings and cityscape" 
                className="rounded-2xl shadow-2xl w-full h-auto" 
              />
              
              {/* Floating Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <Card className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                          250+
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Properties</div>
                      </div>
                      <div className="w-px h-12 bg-gray-200 dark:bg-gray-600"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                          95%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Featured Properties - Clickable Container */}
      <motion.section 
        className="py-12 bg-[#FFF5FF]/50 dark:bg-[#1a0f2e] cursor-pointer hover:bg-[#A187B0]/20 dark:hover:bg-[#2a1a3f] transition-colors duration-200"
        onClick={(e) => {
          // Only navigate if clicking on the section background, not on property cards
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.property-card-wrapper') === null) {
            window.location.href = '/properties';
          }
        }}
        variants={fadeInUp}
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div className="flex justify-between items-center mb-8" variants={fadeIn}>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Find Your New Home!</h2>
            </div>
          </motion.div>

          {/* Property Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            {(properties.length > 0 ? properties : DEMO_PROPERTIES).slice(0, 6).map((property: any) => (
              <motion.div 
                key={property.id} 
                className="property-card-wrapper"
                onClick={(e) => e.stopPropagation()}
                variants={fadeInUp}
              >
                <PropertyCard property={property} />
              </motion.div>
            ))}
          </motion.div>

        </div>
      </motion.section>

      {/* Categories / Collections Section */}
      <motion.section 
        className="py-16 bg-white dark:bg-gray-800"
        variants={fadeInUp}
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Explore by Category</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Find the right place faster</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15 } },
            }}
          >
            {[{
              title: 'Family Apartments',
              image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            },{
              title: 'Student Housing',
              image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            },{
              title: 'Commercial Spaces',
              image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            }].map((c) => (
              <motion.div key={c.title} variants={fadeInUp}>
              <Card className="overflow-hidden group border-0 shadow-lg transition-transform duration-500 hover:-translate-y-2">
                <div className="relative h-56">
                  <img src={c.image} alt={c.title} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute inset-0 flex items-end p-6">
                    <div>
                      <h3 className="text-white text-xl font-semibold">{c.title}</h3>
                      <Button variant="secondary" asChild className="mt-3">
                        <Link href="/properties">Browse</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section 
        className="py-16 bg-[#FFF5FF]/50 dark:bg-[#1a0f2e]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Trusted by Thousands</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">Join Pakistan's growing community of smart renters</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.15 } },
            }}
          >
            {[
              { icon: Users, label: "Active Users", value: 500, suffix: "+" },
              { icon: FileText, label: "Smart Contracts", value: 150, suffix: "+" },
              { icon: CheckCircle, label: "Successful Rentals", value: 300, suffix: "+" },
              { icon: TrendingUp, label: "Success Rate", value: 95, suffix: "%", duration: 1.2 },
            ].map(({ icon: Icon, label, value, suffix, duration }) => (
              <motion.div key={label} className="text-center" variants={fadeInUp}>
                <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="text-white h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-foreground dark:text-white mb-2">
                  {value.toLocaleString()}{suffix}
                </div>
                <div className="text-muted-foreground dark:text-gray-400">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}
