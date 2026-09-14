"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Clock, BarChart } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface FeaturedCourse {
  id: string;
  name: string;
  description: string;
  price: number;
  thumbnail_url?: string;
  metadata?: Record<string, any>;
}

function getYouTubeEmbedUrl(url?: string) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^?&/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturedCourses() {
  const [courses, setCourses] = useState<FeaturedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedCourses = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const courseItems = (data || []).filter((item: any) => {
          const productType = (item.product_type ?? item.type ?? "").toString().toLowerCase();
          return productType === "course";
        }).slice(0, 3);

        setCourses(courseItems.map((item: any) => ({ ...item, type: item.product_type ?? item.type ?? "course" })));
      } catch (error) {
        console.error("Unable to load featured courses:", error);
        setCourses([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedCourses();
  }, []);

  return (
    <section className="py-14 sm:py-20 bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
            Trading Education
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Featured <span className="gold-gradient-text">Courses</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Build a more disciplined trading process with structured learning from the platform catalog.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
        ) : courses.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            {courses.map((course) => (
              <motion.div
                key={course.id}
                variants={itemVariants}
                className="dark-card overflow-hidden group"
              >
                <div className="relative h-44 sm:h-48 overflow-hidden bg-dark-900">
                  {getYouTubeEmbedUrl(course.metadata?.video_url) ? (
                    <iframe
                      className="h-full w-full"
                      src={getYouTubeEmbedUrl(course.metadata?.video_url) || undefined}
                      title={course.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : course.metadata?.video_url ? (
                    <video
                      className="h-full w-full object-cover"
                      src={course.metadata.video_url}
                      poster={course.thumbnail_url}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500/20 transition-colors group-hover:bg-gold-500/30">
                        <Play className="h-8 w-8 text-gold-400" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-dark-950/80 text-xs font-medium text-gold-400">
                    {course.metadata?.level || "All Levels"}
                  </div>
                  <div className="absolute inset-0 bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-gold-400 transition-colors">
                    {course.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.metadata?.duration || "Self-paced"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BarChart className="w-4 h-4" />
                      <span>{course.metadata?.lessons || "Flexible"} lessons</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-dark-800">
                    <div className="text-xl sm:text-2xl font-bold gold-gradient-text">
                      ${Number(course.price || 0).toFixed(2)}
                    </div>
                    <Link
                      href={`/courses/${course.id}`}
                      className="flex items-center space-x-1 text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      <span className="text-sm font-medium">Learn More</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No courses are currently available.</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/courses"
            className="inline-flex items-center space-x-2 px-8 py-3 rounded-lg border border-gold-500/50 text-gold-400 hover:bg-gold-500/10 transition-all"
          >
            <span>View All Courses</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
