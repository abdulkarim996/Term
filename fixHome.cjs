const fs = require('fs');
let c = fs.readFileSync('src/components/home/HomeScreen.tsx', 'utf8');

c = c.replace(/if \(h < 5\) return '.*?'/, "if (h < 5) return 'تصبح على خير'");
c = c.replace(/if \(h < 12\) return '.*?'/, "if (h < 12) return 'صباح الخير'");
c = c.replace(/if \(h < 17\) return '.*?'/, "if (h < 17) return 'مساء الخير'");
c = c.replace(/return '.*?'\n  \}/, "return 'مساء الخير'\n  }");

c = c.replace(/return new Date\(\)\.toLocaleDateString\('ar-SA'.*?\)/, "return new Date().toLocaleDateString('ar-SA', { weekday: 'long', calendar: 'gregory' })");
c = c.replace(/const getDateString = \(\) => \{\n    return new Date\(\)\.toLocaleDateString\('ar-SA'.*?\)\n  \}/, "const getDateString = () => { return new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric', calendar: 'gregory' }) }");

c = c.replace(/<p className="text-xs text-text-muted mt-0.5">\n            \{getDayName\(\)\}.*?\{getDateString\(\)\}<\/p>/s, '<p className="text-xs text-text-muted mt-0.5">{getDayName()}، {getDateString()}</p>');

c = c.replace(/<h1 className="text-2xl font-bold text-text-primary mt-1">\n            \{getGreeting\(\)\}.*?\n          <\/h1>/s, '<h1 className="text-2xl font-bold text-text-primary mt-1">{getGreeting()} {userName ? userName : ""} 👋</h1>');

c = c.replace(/<CheckSquare size=\{12\} \/> \{totalTasks\}.*?<\/span>/s, '<CheckSquare size={12} /> {totalTasks} مهام عاجلة</span>');
c = c.replace(/<Calendar size=\{12\} \/> \{todayLectures\}.*?<\/span>/s, '<Calendar size={12} /> {todayLectures} محاضرات اليوم</span>');

c = c.replace(/<h2 className="text-sm font-semibold text-text-primary">.*?<\/h2>/, '<h2 className="text-sm font-semibold text-text-primary">محاضرات اليوم</h2>');
c = c.replace(/<button\n            onClick=\{\(\) => setActiveTab\('calendar'\)\}\n            className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-400 transition-colors"\n          >\n            .*? <ChevronRight/s, '<button\n            onClick={() => setActiveTab(\\'calendar\\')}\n            className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-400 transition-colors"\n          >\n            عرض الجدول <ChevronRight');

c = c.replace(/<p className="text-text-muted text-sm mt-1">.*?<\/p>/, '<p className="text-text-muted text-sm mt-1">لا توجد محاضرات متبقية اليوم</p>');
c = c.replace(/<h3 className="text-base font-semibold text-text-primary mb-1">.*?<\/h3>/, '<h3 className="text-base font-semibold text-text-primary mb-1">يوم خفيف!</h3>');

// "الآن" label
c = c.replace(/<span className="flex-shrink-0 badge bg-accent-green\/10 text-accent-green border border-accent-green\/20">\n.*?<\/span>/s, '<span className="flex-shrink-0 badge bg-accent-green/10 text-accent-green border border-accent-green/20">الآن</span>');

// Urgent Tasks
c = c.replace(/<h2 className="text-sm font-semibold text-text-primary">.*?<\/h2>/, '<h2 className="text-sm font-semibold text-text-primary">المهام العاجلة</h2>'); // Wait, replace only the second h2? I will use regex with match index
fs.writeFileSync('src/components/home/HomeScreen.tsx', c);
