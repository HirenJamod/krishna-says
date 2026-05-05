const pptxgen = require('pptxgenjs');

async function createPresentation() {
    let pres = new pptxgen();

    // 1. Title Slide
    let slide1 = pres.addSlide();
    slide1.background = { color: '0F172A' };
    slide1.addText('Krishna says', { x: 0.5, y: 1.5, w: '90%', fontFace: 'Outfit', fontSize: 44, color: 'FF9933', bold: true, align: 'center' });
    slide1.addText('Modern Spiritual Guidance Platform', { x: 0.5, y: 2.5, w: '90%', fontFace: 'Outfit', fontSize: 24, color: 'F8FAFC', align: 'center' });
    slide1.addText('Multi-Agent AI Architecture', { x: 0.5, y: 4.5, w: '90%', fontFace: 'Outfit', fontSize: 18, color: '94A3B8', align: 'center' });

    // 2. Onboarding Experience
    let slide2 = pres.addSlide();
    slide2.background = { color: '0F172A' };
    slide2.addText('Personalized Onboarding', { x: 0.5, y: 0.5, w: '90%', fontFace: 'Outfit', fontSize: 32, color: 'FF9933', bold: true });
    slide2.addText('• User-centric spiritual depth selection (Practical, Philosophical, Deep)\n• Multi-lingual support (English, Hindi, Gujarati)\n• OTP-secured spiritual identity', { x: 0.5, y: 1.5, w: '40%', fontFace: 'Outfit', fontSize: 18, color: 'F8FAFC' });
    // Placeholder for Screenshot 1
    slide2.addShape(pres.ShapeType.rect, { x: 5.0, y: 1.0, w: 4.5, h: 4.0, fill: { color: '1E293B' }, line: { color: 'FF9933', width: 2 } });
    slide2.addText('[Welcome Screen Screenshot]', { x: 5.0, y: 2.8, w: 4.5, align: 'center', color: '94A3B8' });

    // 3. Multi-Agent Architecture
    let slide3 = pres.addSlide();
    slide3.background = { color: '0F172A' };
    slide3.addText('The Intelligence Layer', { x: 0.5, y: 0.5, w: '90%', fontFace: 'Outfit', fontSize: 32, color: 'FF9933', bold: true });
    
    // Agent Grid
    slide3.addText('Master Agent', { x: 0.5, y: 1.5, w: 3, h: 1, fill: { color: '6366F1' }, color: 'FFFFFF', align: 'center', fontFace: 'Outfit', bold: true });
    slide3.addText('Search Agent\n(Weighted Matching)', { x: 4.0, y: 1.5, w: 2.5, h: 1, fill: { color: '1E293B' }, color: '94A3B8', align: 'center', fontSize: 14 });
    slide3.addText('Context Agent\n(Memory/Threads)', { x: 7.0, y: 1.5, w: 2.5, h: 1, fill: { color: '1E293B' }, color: '94A3B8', align: 'center', fontSize: 14 });
    
    slide3.addText('• Context-Aware Responses: Remembers previous interactions.\n• High Accuracy: Weighted scoring for multiple keywords.\n• Safety First: Built-in guardrails for sensitive topics.', { x: 0.5, y: 3.5, w: '90%', fontFace: 'Outfit', fontSize: 18, color: 'F8FAFC' });

    // 4. Immersive Features
    let slide4 = pres.addSlide();
    slide4.background = { color: '0F172A' };
    slide4.addText('Immersive Experience', { x: 0.5, y: 0.5, w: '90%', fontFace: 'Outfit', fontSize: 32, color: 'FF9933', bold: true });
    slide4.addText('• Temple Mode: Distraction-free meditation view.\n• Ambient Audio: Flute, Nature, and Chants.\n• Verse Cards: Beautifully rendered wisdom for sharing.\n• Daily Streaks: Encouraging consistent reflection.', { x: 0.5, y: 1.5, w: '90%', fontFace: 'Outfit', fontSize: 18, color: 'F8FAFC' });

    // 5. Conclusion
    let slide5 = pres.addSlide();
    slide5.background = { color: '0F172A' };
    slide5.addText('Ready for Deployment', { x: 0.5, y: 2.0, w: '90%', fontFace: 'Outfit', fontSize: 36, color: 'accent', align: 'center', bold: true });
    slide5.addText('Experience the future of spiritual guidance.', { x: 0.5, y: 3.0, w: '90%', fontFace: 'Outfit', fontSize: 20, color: 'F8FAFC', align: 'center' });

    // Save the Presentation
    pres.writeFile({ fileName: 'Krishna_Says_Project_Overview.pptx' })
        .then(fileName => {
            console.log(`Presentation created: ${fileName}`);
        })
        .catch(err => {
            console.error('Error creating presentation:', err);
        });
}

createPresentation();
