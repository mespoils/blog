@echo off
git add -A
git commit -m "Update site content - %date% %time%"
git push
echo.
echo Pushed. Netlify will auto-deploy to https://mespoils.netlify.app/
pause
