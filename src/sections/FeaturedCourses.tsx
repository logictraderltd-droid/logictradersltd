"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, Clock, BarChart } from "lucide-react";

const courses = [
  {
    id: "1",
    title: "Forex Trading Masterclass",
    description: "Complete guide to forex trading from beginner to advanced strategies",
    price: 199.99,
    duration: "12 hours",
    level: "All Levels",
    lessons: 24,
    thumbnail: "/images/course-forex.jpg",
  },
  {
    id: "2",
    title: "Crypto Trading Strategies",
    description: "Proven strategies for cryptocurrency trading and analysis",
    price: 149.99,
    duration: "8 hours",
    level: "Intermediate",
    lessons: 16,
    thumbnail: "/images/course-crypto.jpg",
  },
  {
    id: "3",
    title: "Risk Management Essentials",
    description: "Learn to protect your capital with professional risk management",
    price: 99.99,
    duration: "4 hours",
    level: "Beginner",
    lessons: 8,
    thumbnail: "/images/course-risk.jpg",
  },
];

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
  return (
    <section className="py-20 bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
            Trading Education
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Featured <span className="gold-gradient-text">Courses</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Master the art of trading with our comprehensive video courses designed by industry experts
          </p>
        </motion.div>

        {/* Course Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {courses.map((course) => (
            <motion.div
              key={course.id}
              variants={itemVariants}
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
                  {course.level}
                </div>
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gold-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 group-hover:text-gold-400 transition-colors">
                  {course.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Meta Info */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BarChart className="w-4 h-4" />
                    <span>{course.lessons} lessons</span>
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                  <div className="text-2xl font-bold gold-gradient-text">
                    ${course.price}
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

        {/* View All Button */}
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
