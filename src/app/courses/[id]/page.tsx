"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Clock,
  BookOpen,
  Star,
  Check,
  Lock,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";

interface CourseLesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  order_index: number;
  is_preview: boolean;
}

interface Course {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  thumbnail_url: string;
  metadata: {
    level?: string;
    duration?: string;
    students?: number;
    rating?: number;
    instructor?: string;
    what_you_learn?: string[];
    requirements?: string[];
  };
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [params.id, user]);

  const fetchCourseData = async () => {
    const supabase = createBrowserClient();

    try {
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("type", "course")
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch course lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", params.id)
        .order("order_index", { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Check if user has access
      if (user) {
        const { data: accessData } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", params.id)
          .eq("is_active", true)
          .single();

        setHasAccess(!!accessData);
      }
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnroll = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/courses/${params.id}`);
      return;
    }
    router.push(`/checkout?product=${params.id}`);
  };

  const handleStartLearning = () => {
    router.push(`/dashboard/courses/${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <Link href="/courses" className="gold-button">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const totalDuration = lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <section className="relative py-20 border-b border-dark-800">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link
            href="/courses"
            className="inline-flex items-center text-gray-400 hover:text-gold-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Course Info */}
            <div>
              <div className="flex items-center space-x-4 mb-4">
                {course.metadata?.level && (
                  <span className="px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-sm">
                    {course.metadata.level}
                  </span>
                )}
                <div className="flex items-center text-gray-400">
                  <Star className="w-4 h-4 text-gold-400 fill-gold-400 mr-1" />
                  <span>{course.metadata?.rating || "4.8"}</span>
                  <span className="mx-2">•</span>
                  <span>{course.metadata?.students || "1,234"} students</span>
                </div>
              </div>

              <h1 className="text-4xl font-bold mb-4 gold-gradient-text">
                {course.name}
              </h1>

              <p className="text-gray-300 text-lg mb-6">{course.description}</p>

              {course.metadata?.instructor && (
                <p className="text-gray-400 mb-4">
                  Instructor: <span className="text-white">{course.metadata.instructor}</span>
                </p>
              )}

              <div className="flex items-center space-x-6 text-gray-400 mb-8">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  <span>
                    {hours}h {minutes}m
                  </span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  <span>{lessons.length} lessons</span>
                </div>
              </div>

              {/* Price and CTA */}
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold gold-gradient-text">
                  ${course.price}
                </div>
                {hasAccess ? (
                  <button
                    onClick={handleStartLearning}
                    className="gold-button flex items-center"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Learning
                  </button>
                ) : (
                  <button onClick={handleEnroll} className="gold-button flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Enroll Now
                  </button>
                )}
              </div>
            </div>

            {/* Course Thumbnail */}
            <div className="relative">
              <div className="aspect-video rounded-2xl overflow-hidden bg-dark-900">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-20 h-20 text-gold-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* What You'll Learn */}
              {course.metadata?.what_you_learn && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="dark-card p-8"
                >
                  <h2 className="text-2xl font-bold mb-6">What You'll Learn</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {course.metadata.what_you_learn.map((item, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Course Curriculum */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-6">Course Curriculum</h2>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className={`p-4 rounded-lg border transition-colors ${lesson.is_preview || hasAccess
                        ? "border-dark-700 hover:border-gold-500/50 hover:bg-dark-800 cursor-pointer"
                        : "border-dark-800 bg-dark-900/50"
                        }`}
                      onClick={() => {
                        if (hasAccess) {
                          router.push(`/dashboard/courses/${params.id}`);
                        } else if (lesson.is_preview) {
                          router.push(`/courses/${params.id}/watch/${lesson.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
                            {lesson.is_preview || hasAccess ? (
                              <Play className="w-5 h-5 text-gold-400" />
                            ) : (
                              <Lock className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">
                              {index + 1}. {lesson.title}
                            </h3>
                            {lesson.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {lesson.is_preview && (
                            <span className="px-2 py-1 rounded bg-gold-500/20 text-gold-400 text-xs">
                              Preview
                            </span>
                          )}
                          {lesson.duration && (
                            <span className="text-sm text-gray-400">
                              {Math.floor(lesson.duration / 60)}:
                              {String(lesson.duration % 60).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Requirements */}
              {course.metadata?.requirements && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="dark-card p-8"
                >
                  <h2 className="text-2xl font-bold mb-6">Requirements</h2>
                  <ul className="space-y-3">
                    {course.metadata.requirements.map((req, index) => (
                      <li key={index} className="flex items-start text-gray-300">
                        <span className="text-gold-400 mr-3">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="dark-card p-6 sticky top-24">
                <h3 className="text-xl font-bold mb-4">This Course Includes:</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-300">
                    <Clock className="w-5 h-5 mr-3 text-gold-400" />
                    <span>
                      {hours}h {minutes}m on-demand video
                    </span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <BookOpen className="w-5 h-5 mr-3 text-gold-400" />
                    <span>{lessons.length} lessons</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 mr-3 text-gold-400" />
                    <span>Full lifetime access</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 mr-3 text-gold-400" />
                    <span>Certificate of completion</span>
                  </div>
                </div>

                {!hasAccess && (
                  <>
                    <div className="text-3xl font-bold gold-gradient-text mb-4">
                      ${course.price}
                    </div>
                    <button onClick={handleEnroll} className="gold-button w-full">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Enroll Now
                    </button>
                  </>
                )}

                {hasAccess && (
                  <button onClick={handleStartLearning} className="gold-button w-full">
                    <Play className="w-5 h-5 mr-2" />
                    Continue Learning
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
