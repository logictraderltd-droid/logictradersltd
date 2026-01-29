"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";

interface CourseLesson {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration: number;
  order_index: number;
  is_preview: boolean;
  course_id: string;
}

interface Course {
  id: string;
  name: string;
}

export default function WatchLessonPage({
  params,
}: {
  params: { id: string; lessonId: string };
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<CourseLesson | null>(null);
  const [allLessons, setAllLessons] = useState<CourseLesson[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/courses/${params.id}/watch/${params.lessonId}`);
      return;
    }
    fetchLessonData();
  }, [params.lessonId, user]);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const fetchLessonData = async () => {
    const supabase = createBrowserClient();

    try {
      // Fetch current lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("id", params.lessonId)
        .single();

      if (lessonError) throw lessonError;
      setCurrentLesson(lessonData);

      // Fetch course
      const { data: courseData } = await supabase
        .from("products")
        .select("id, name")
        .eq("id", lessonData.course_id)
        .single();

      setCourse(courseData);

      // Fetch all lessons for navigation
      const { data: lessonsData } = await supabase
        .from("course_lessons")
        .select("*")
        .eq("course_id", lessonData.course_id)
        .order("order_index", { ascending: true });

      setAllLessons(lessonsData || []);

      // Check access
      if (user) {
        const { data: accessData } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", lessonData.course_id)
          .eq("is_active", true)
          .single();

        const access = !!accessData || lessonData.is_preview;
        setHasAccess(access);

        if (access) {
          // Fetch signed video URL from API
          const response = await fetch(`/api/videos/${params.lessonId}`);
          const data = await response.json();
          if (data.url) {
            setVideoUrl(data.url);
          }

          // Fetch existing progress
          const { data: progressData } = await supabase
            .from("video_progress")
            .select("progress_seconds, completed")
            .eq("user_id", user.id)
            .eq("lesson_id", params.lessonId)
            .single();

          if (progressData?.progress_seconds) {
            setProgress(progressData.progress_seconds);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching lesson:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = async (currentTime: number, completed: boolean = false) => {
    if (!user || !currentLesson) return;

    try {
      await fetch(`/api/videos/${params.lessonId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressSeconds: Math.floor(currentTime),
          completed,
        }),
      });
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleVideoPlay = () => {
    // Update progress every 10 seconds
    progressInterval.current = setInterval(() => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;
        updateProgress(currentTime);
      }
    }, 10000);
  };

  const handleVideoPause = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    if (videoRef.current) {
      updateProgress(videoRef.current.currentTime);
    }
  };

  const handleVideoEnded = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    if (videoRef.current) {
      updateProgress(videoRef.current.duration, true);
    }
  };

  const goToLesson = (lessonId: string) => {
    router.push(`/courses/${params.id}/watch/${lessonId}`);
  };

  const currentIndex = allLessons.findIndex((l) => l.id === params.lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You need to enroll in this course to watch this lesson.
          </p>
          <Link href={`/courses/${params.id}`} className="gold-button">
            View Course Details
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Lesson Not Found</h1>
          <Link href={`/courses/${params.id}`} className="gold-button">
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Video Player Section */}
      <section className="relative bg-black">
        <div className="max-w-7xl mx-auto">
          {/* Navigation Bar */}
          <div className="flex items-center justify-between p-4 border-b border-dark-800">
            <Link
              href={`/courses/${params.id}`}
              className="flex items-center text-gray-400 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Back to Course</span>
            </Link>
            <h1 className="text-lg font-medium truncate max-w-md">
              {course?.name}
            </h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>

          {/* Video Player */}
          <div className="aspect-video bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                controlsList="nodownload"
                className="w-full h-full"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoEnded}
                onLoadedMetadata={() => {
                  if (videoRef.current && progress > 0) {
                    videoRef.current.currentTime = progress;
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <PlayCircle className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Loading video...</p>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Navigation */}
          <div className="flex items-center justify-between p-4 border-t border-dark-800">
            <button
              onClick={() => prevLesson && goToLesson(prevLesson.id)}
              disabled={!prevLesson}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                prevLesson
                  ? "hover:bg-dark-800 text-white"
                  : "text-gray-600 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-400">
                Lesson {currentIndex + 1} of {allLessons.length}
              </p>
            </div>

            <button
              onClick={() => nextLesson && goToLesson(nextLesson.id)}
              disabled={!nextLesson}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                nextLesson
                  ? "hover:bg-dark-800 text-white"
                  : "text-gray-600 cursor-not-allowed"
              }`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lesson Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-4">{currentLesson.title}</h2>
                {currentLesson.description && (
                  <p className="text-gray-300 mb-6">{currentLesson.description}</p>
                )}
                {currentLesson.is_preview && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-sm">
                    Preview Lesson
                  </div>
                )}
              </motion.div>
            </div>

            {/* Course Outline Sidebar */}
            <div className="lg:col-span-1">
              <div className="dark-card p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Course Content</h3>
                <div className="space-y-2">
                  {allLessons.map((lesson) => {
                    const isCompleted = false; // TODO: Check completion status
                    const isCurrent = lesson.id === params.lessonId;
                    const canAccess = lesson.is_preview || hasAccess;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => canAccess && goToLesson(lesson.id)}
                        disabled={!canAccess}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          isCurrent
                            ? "bg-gold-500/20 border border-gold-500/50"
                            : canAccess
                            ? "hover:bg-dark-800 border border-transparent"
                            : "opacity-50 cursor-not-allowed border border-transparent"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : canAccess ? (
                              <PlayCircle className="w-5 h-5 text-gold-400" />
                            ) : (
                              <Lock className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium text-sm truncate ${
                                isCurrent ? "text-gold-400" : "text-white"
                              }`}
                            >
                              {lesson.title}
                            </p>
                            {lesson.duration && (
                              <p className="text-xs text-gray-500 mt-1">
                                {Math.floor(lesson.duration / 60)}:
                                {String(lesson.duration % 60).padStart(2, "0")}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
