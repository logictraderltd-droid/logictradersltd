"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Clock, BarChart, ArrowRight, BookOpen } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { Course } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  useEffect(() => {
    const fetchCourses = async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("type", "course")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching courses:", error);
      } else {
        setCourses(data || []);
      }
      setIsLoading(false);
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = levelFilter === "all" || course.metadata?.level?.toLowerCase() === levelFilter.toLowerCase();
    return matchesSearch && matchesLevel;
  });

  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
              <BookOpen className="w-4 h-4 inline mr-2" />
              Trading Education
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Master Trading with Our{" "}
              <span className="gold-gradient-text">Expert Courses</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Learn from industry professionals and take your trading skills to the next level
              with our comprehensive video courses.
            </p>

            {/* Search and Filters */}
            <div className="mt-12 max-w-4xl mx-auto flex flex-col md:flex-row gap-4 px-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 transition-all pl-14"
                />
                <Play className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              <div className="flex gap-2">
                {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-6 py-4 rounded-2xl border transition-all capitalize font-medium ${levelFilter === lvl
                        ? 'bg-gold-500 text-dark-950 border-gold-500'
                        : 'bg-dark-900 border-dark-800 text-gray-400 hover:border-gold-500/30'
                      }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="dark-card overflow-hidden group"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-dark-800 to-dark-900 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center group-hover:bg-gold-500/30 transition-colors">
                        <Play className="w-8 h-8 text-gold-400" />
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-dark-950/80 text-xs font-medium text-gold-400">
                      {course.metadata?.level || "All Levels"}
                    </div>
                    <div className="absolute inset-0 bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-gold-400 transition-colors">
                      {course.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.metadata?.duration || "Self-paced"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BarChart className="w-4 h-4" />
                        <span>{course.metadata?.lessons || "Multiple"} lessons</span>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                      <div className="text-2xl font-bold gold-gradient-text">
                        ${course.price}
                      </div>
                      <Link
                        href={`/checkout?product=${course.id}`}
                        className="flex items-center space-x-1 text-gold-400 hover:text-gold-300 transition-colors"
                      >
                        <span className="text-sm font-medium">Enroll Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400">No courses available</h3>
              <p className="text-gray-500 mt-2">Check back soon for new courses</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
