#!/bin/bash
# Quick Commands for Competitive Intelligence Stress Test

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Competitive Intelligence - Quick Commands              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Function to show menu
show_menu() {
    echo "Available Commands:"
    echo ""
    echo "1. Check if server is running"
    echo "2. Start dev server"
    echo "3. Stop dev server"
    echo "4. Check database connection"
    echo "5. Open stress test guide"
    echo "6. Open test data file"
    echo "7. Check for errors in browser logs"
    echo "8. Exit"
    echo ""
}

while true; do
    show_menu
    read -p "Enter choice [1-8]: " choice
    
    case $choice in
        1)
            echo "Checking server..."
            curl -s http://localhost:3000/api/competitive-analysis | head -1
            ;;
        2)
            echo "Starting dev server..."
            npm run dev
            ;;
        3)
            echo "Stopping dev server..."
            pkill -f "next dev"
            echo "Server stopped"
            ;;
        4)
            echo "Testing Supabase connection..."
            curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" | head -5
            ;;
        5)
            if [ -f "START_HERE_STRESS_TEST.md" ]; then
                cat START_HERE_STRESS_TEST.md | less
            else
                echo "File not found!"
            fi
            ;;
        6)
            if [ -f "ITONICS_TEST_DATA.txt" ]; then
                cat ITONICS_TEST_DATA.txt | less
            else
                echo "File not found!"
            fi
            ;;
        7)
            echo "Opening browser console to check for errors..."
            echo "Press F12 in your browser and check the Console tab"
            ;;
        8)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    clear
done
