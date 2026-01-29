"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play, Lock, CheckCircle, Clock, BookOpen, Download, AlertCircle, Share2, Star, MonitorPlay, List, ChevronRight, ChevronLeft, SkipForward, SkipBack } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { Course, CourseLesson } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { CldVideoPlayer } from 'next-cloudinary';
import 'next-cloudinary/dist/cld-video-player.css';

export default function CourseViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { isAdmin: authIsAdmin, isLoading: authLoading } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<CourseLesson[]>([]);
    const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
    const [completedLessons, setCompletedLessons] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProgress, setIsSavingProgress] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Calculate Prev/Next Lessons
    const currentIndex = lessons.findIndex(l => l.id === activeLesson?.id);
    const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
    const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

    const handleLessonTransition = (lesson: CourseLesson) => {
        setActiveLesson(lesson);
        setIsPlaying(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const supabase = createBrowserClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                if (!params.courseId) return;

                // 1. Check Access
                const { data: access } = await supabase
                    .from('user_access')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('product_id', params.courseId)
                    .eq('is_active', true)
                    .maybeSingle();

                // If user doesn't have explicit access record, check if they are the admin
                const isUserAdmin = authIsAdmin || user.email === 'logictraderltd@gmail.com';

                if (!access && !isUserAdmin) {
                    setError("You don't have access to this course. Please purchase it to continue.");
                    setIsLoading(false);
                    return;
                }

                // 2. Fetch course details
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', params.courseId)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Course not found');

                setCourse(data as Course);

                // 3. Fetch lessons
                const { data: lessonsData, error: lessonsError } = await supabase
                    .from('course_lessons')
                    .select('*')
                    .eq('course_id', params.courseId)
                    .order('order_index', { ascending: true });

                if (lessonsError) throw lessonsError;

                const lessonsList = lessonsData || [];
                setLessons(lessonsList);

                if (lessonsList.length > 0) {
                    setActiveLesson(lessonsList[0]);
                }

                // 4. Fetch Progress
                const { data: progressData } = await supabase
                    .from('video_progress')
                    .select('lesson_id')
                    .eq('user_id', user.id)
                    .eq('completed', true);

                if (progressData) {
                    setCompletedLessons(progressData.map(p => p.lesson_id));
                }

            } catch (err: any) {
                console.error('Error fetching course:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourse();
    }, [params.courseId, router]);

    const handleToggleComplete = async (lessonId: string) => {
        try {
            setIsSavingProgress(true);
            const supabase = createBrowserClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const isCompleted = completedLessons.includes(lessonId);

            if (isCompleted) {
                // Remove from completed
                await supabase
                    .from('video_progress')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId);

                setCompletedLessons(prev => prev.filter(id => id !== lessonId));
            } else {
                // Mark as completed
                await supabase
                    .from('video_progress')
                    .upsert({
                        user_id: user.id,
                        lesson_id: lessonId,
                        completed: true,
                        last_watched_at: new Date().toISOString()
                    });

                setCompletedLessons(prev => [...prev, lessonId]);
            }
        } catch (err) {
            console.error('Error updating progress:', err);
        } finally {
            setIsSavingProgress(false);
        }
    };

    const progressPercentage = lessons.length > 0
        ? Math.round((completedLessons.length / lessons.length) * 100)
        : 0;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
                    <p className="text-gray-500 animate-pulse">Loading experience...</p>
                </div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md w-full bg-dark-900/50 p-8 rounded-2xl border border-dark-800 backdrop-blur-xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 mb-6">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Course Unavailable</h1>
                    <p className="text-gray-400">{error || "The content you are looking for is restricted or does not exist."}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 w-full px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-gold-500/30">
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 via-dark-900/50 to-[#050505] opacity-50" />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="group flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-medium hidden sm:block font-display">Back to Dashboard</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <h2 className="text-sm font-bold text-white line-clamp-1 max-w-[300px] font-display">{course.name}</h2>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{currentIndex + 1} / {lessons.length} Modules</p>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gold-500 transition-colors">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-16 px-4 md:px-8 max-w-[1800px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

                    {/* Left Column: Player & Core Content (YouTube Style) */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Cinematic Video Player */}
                        <div className="group relative w-full aspect-video bg-dark-950 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5">
                            {!isPlaying ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-20 group/play"
                                    onClick={() => setIsPlaying(true)}>
                                    <div className="absolute inset-0">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url}
                                                alt={course.name}
                                                className="w-full h-full object-cover opacity-60 group-hover/play:opacity-40 transition-all duration-700 transform scale-105 group-hover/play:scale-100"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-dark-800 to-black" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center gap-6">
                                        <div className="w-24 h-24 rounded-full bg-gold-500 flex items-center justify-center shadow-2xl shadow-gold-500/20 group-hover/play:scale-110 transition-transform duration-500">
                                            <Play className="w-10 h-10 text-black fill-current ml-1" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-white group-hover/play:text-gold-400 transition-colors font-display">Start Learning</p>
                                            <p className="text-gray-400 text-sm mt-1">{activeLesson?.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : activeLesson ? (
                                <div className="absolute inset-0 z-10" key={activeLesson.id}>
                                    {activeLesson.cloudinary_public_id ? (
                                        <CldVideoPlayer
                                            width="1920"
                                            height="1080"
                                            src={activeLesson.cloudinary_public_id}
                                            colors={{ accent: '#EAB308', base: '#000000', text: '#ffffff' }}
                                            fontFace="Inter"
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <video
                                            src={activeLesson.video_url}
                                            controls
                                            autoPlay
                                            className="w-full h-full object-contain bg-black"
                                            poster={course.thumbnail_url}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-dark-900 font-display">
                                    <p className="text-gray-400">No content available.</p>
                                </div>
                            )}
                        </div>

                        {/* YouTube Style Navigation & Controls */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-white/5 pb-8">
                            <div className="space-y-1">
                                <h1 className="text-2xl md:text-3xl font-bold font-display text-white">{activeLesson?.title}</h1>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5"><List className="w-4 h-4" />Module {currentIndex + 1} of {lessons.length}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{activeLesson?.duration || 'Self-paced'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => prevLesson && handleLessonTransition(prevLesson)}
                                    disabled={!prevLesson}
                                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all hover:text-gold-400"
                                >
                                    <SkipBack className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleToggleComplete(activeLesson?.id || '')}
                                    disabled={isSavingProgress || !activeLesson}
                                    className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${completedLessons.includes(activeLesson?.id || '')
                                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                        : 'bg-gold-500 text-black hover:bg-gold-600 shadow-lg shadow-gold-500/20'
                                        }`}
                                >
                                    {completedLessons.includes(activeLesson?.id || '') ? <CheckCircle className="w-5 h-5" /> : null}
                                    {completedLessons.includes(activeLesson?.id || '') ? 'Finished' : 'Mark as Completed'}
                                </button>
                                <button
                                    onClick={() => nextLesson && handleLessonTransition(nextLesson)}
                                    disabled={!nextLesson}
                                    className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-all hover:text-gold-400"
                                >
                                    <SkipForward className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Overview / Description Area */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-gold-500/20 rounded-lg text-gold-500">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold font-display">About this lesson</h3>
                            </div>
                            <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-p:leading-relaxed">
                                {activeLesson?.description ? (
                                    <div className="text-gray-300 whitespace-pre-wrap">{activeLesson.description}</div>
                                ) : (
                                    <p className="italic text-gray-500">No additional description provided for this module.</p>
                                )}
                            </div>

                            {/* Course Context (Summary) */}
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Course Context</h4>
                                <p className="text-gray-400 line-clamp-3 leading-relaxed">{course.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: High-End Sidebar (YouTube-Style Playlist) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Progress Section */}
                        <div className="bg-dark-900/50 border border-gold-500/20 rounded-3xl p-6 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-gold-500">
                                    <MonitorPlay className="w-5 h-5" />
                                    <span className="font-bold font-display uppercase tracking-wider text-xs">Course Journey</span>
                                </div>
                                <span className="text-xs font-mono text-gray-500 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                    {progressPercentage}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Curriculum Sidebar (The YouTube Playlist) */}
                        <div className="bg-dark-950 border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[700px] shadow-2xl">
                            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between bg-gradient-to-br from-gold-500/5 to-transparent">
                                <div className="flex items-center gap-3">
                                    <List className="w-5 h-5 text-gold-500" />
                                    <h3 className="font-bold font-display">Course Curriculum</h3>
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                                    {lessons.length} Parts
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                {lessons.map((lesson, index) => {
                                    const isActive = activeLesson?.id === lesson.id;
                                    const isCompleted = completedLessons.includes(lesson.id);

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => handleLessonTransition(lesson)}
                                            className={`w-full group text-left p-4 rounded-2xl transition-all relative overflow-hidden flex items-start gap-4 ${isActive
                                                ? 'bg-gold-500/10 border border-gold-500/30'
                                                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                                                }`}
                                        >
                                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />}

                                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-mono font-bold transition-all ${isActive ? 'bg-gold-500 text-black' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'
                                                }`}>
                                                {isCompleted ? <CheckCircle className="w-5 h-5" /> : (index + 1).toString().padStart(2, '0')}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`text-sm font-bold truncate transition-colors ${isActive ? 'text-gold-400' : 'text-gray-300'}`}>
                                                        {lesson.title}
                                                    </h4>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{lesson.description || 'Watch now'}</p>
                                            </div>

                                            {isActive && (
                                                <div className="shrink-0 pt-1">
                                                    <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,1)]" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Resource Sidebar Footer */}
                            {course.metadata?.download_url && (
                                <div className="p-4 border-t border-white/10 bg-white/5">
                                    <a
                                        href={course.metadata.download_url}
                                        target="_blank"
                                        className="flex items-center justify-between p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-500 hover:bg-gold-500 hover:text-black transition-all group font-bold text-sm"
                                    >
                                        <span className="flex items-center gap-2"><Download className="w-4 h-4" /> Resources</span>
                                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Help Card */}
                        <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border border-blue-500/10 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl" />
                            <h3 className="font-bold text-white mb-2 flex items-center gap-2 font-display">Need Technical Support?</h3>
                            <p className="text-sm text-gray-400 mb-4 leading-relaxed">Stuck on a concept? Join our Discord and talk directly with instructors.</p>
                            <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-bold transition-all text-sm uppercase tracking-wider">
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
