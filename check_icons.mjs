
import * as Lucide from 'lucide-react';

const requiredIcons = [
    'LayoutDashboard',
    'ShoppingCart',
    'Package',
    'Users',
    'Settings',
    'LogOut',
    'Plus',
    'Trash2',
    'Search',
    'BarChart3',
    'Receipt',
    'CreditCard',
    'UserCheck',
    'TriangleAlert',
    'Sparkles',
    'TrendingUp',
    'History',
    'RotateCcw',
    'CircleHelp',
    'Printer',
    'CircleCheck',
    'Download',
    'Store',
    'Filter',
    'X',
    'Bell',
    'Info',
    'Menu',
    'ChevronLeft',
    'ChevronRight',
    'Split',
    'Wallet',
    'List',
    'CirclePlus',
    'Banknote',
    'Smartphone',
    'Calendar',
    'Clock',
    'FileText',
    'DollarSign',
    'Pause',
    'Play',
    'Clipboard',
    'User',
    'Activity',
    'Calculator',
    'Wifi',
    'WifiOff',
    'FileDown',
    'Eye',
    'ArrowRight',
    'SquareCheck',
    'SquareX',
    'PiggyBank',
    'File',
    'Percent',
    'Tag',
    'Upload',
    'Globe',
    'Monitor',
    'MapPin',
    'Shield',
    'Lock',
    'Unlock',
    'CloudDownload',
    'Key'
];

console.log("Checking Lucide Icons...");
const missing = [];
requiredIcons.forEach(icon => {
    if (!Lucide[icon]) {
        console.error(`MISSING: ${icon}`);
        missing.push(icon);
    }
});

if (missing.length === 0) {
    console.log("All icons found!");
} else {
    console.log(`Found ${missing.length} missing icons.`);
    process.exit(1);
}
