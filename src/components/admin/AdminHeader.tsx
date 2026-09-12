"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Bell, Menu, User } from "lucide-react";

interface AdminHeaderProps {
    onMenuClick: () => void;
    title: string;
}

export function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
    const { profile } = useAuth();

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 md:px-8 md:py-5 bg-dark-950/80 backdrop-blur-md border-b border-dark-800">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-white capitalize">{title}</h1>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
                <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-950"></span>
                </button>

                <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-dark-800">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-bold text-white">{profile?.first_name || 'Admin'}</p>
                        <p className="text-xs text-gold-400">Administrator</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-dark-950 flex items-center justify-center">
                            <User className="w-5 h-5 text-gold-500" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
