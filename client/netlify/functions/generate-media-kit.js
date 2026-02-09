const { jsPDF } = require('jspdf');

exports.handler = async function(event, context) {
  try {
    // Create PDF document
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: 'TechBlog AI Media Kit',
      subject: 'Advertising Information',
      author: 'TechBlog AI',
      keywords: 'advertising, media kit, tech blog, audience insights',
      creator: 'TechBlog AI'
    });

    // ====== Cover Page ======
    doc.setFontSize(28);
    doc.setTextColor(2, 128, 125); // Teal color
    doc.text("TechBlog AI", 105, 50, { align: 'center' });
    
    doc.setFontSize(22);
    doc.text("Media Kit", 105, 70, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Audience Insights & Advertising Opportunities", 105, 85, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text("Generated on: " + new Date().toLocaleDateString(), 105, 160, { align: 'center' });
    doc.text("Contact: advertise@techblogai.com", 105, 170, { align: 'center' });

    // ====== Page 2: Audience Insights ======
    doc.addPage();
    doc.setFontSize(20);
    doc.setTextColor(2, 128, 125);
    doc.text("Audience Insights", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const insights = [
      { label: "Monthly Unique Visitors", value: "5,000+" },
      { label: "Return Visitor Rate", value: "45%" },
      { label: "Avg. Session Duration", value: "3.5 minutes" },
      { label: "Top Countries", value: "USA (45%), UK (23%), India (12%)" },
      { label: "Tech Professional Audience", value: "85%" },
      { label: "Mobile vs Desktop", value: "60% Mobile, 40% Desktop" }
    ];
    
    let y = 40;
    insights.forEach(insight => {
      doc.setFont("helvetica", "bold");
      doc.text(insight.label + ":", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(insight.value, 80, y);
      y += 10;
    });

    // ====== Page 3: Advertising Options ======
    doc.addPage();
    doc.setFontSize(20);
    doc.setTextColor(2, 128, 125);
    doc.text("Advertising Options", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const options = [
      "Sponsored Content & Articles",
      "Newsletter Features (10,000+ subscribers)",
      "Banner Advertising",
      "Product Reviews",
      "Affiliate Partnerships",
      "Social Media Promotions",
      "Podcast Sponsorships"
    ];
    
    y = 40;
    options.forEach((option, index) => {
      doc.text(`${index + 1}. ${option}`, 25, y);
      y += 10;
    });

    // ====== Page 4: Contact Information ======
    doc.addPage();
    doc.setFontSize(20);
    doc.setTextColor(2, 128, 125);
    doc.text("Contact Information", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const contacts = [
      { label: "Advertising Email", value: "advertise@techblogai.com" },
      { label: "Website", value: "https://techblogai.com" },
      { label: "Response Time", value: "Within 24-48 hours" },
      { label: "Media Kit Updates", value: "Quarterly" }
    ];
    
    y = 40;
    contacts.forEach(contact => {
      doc.setFont("helvetica", "bold");
      doc.text(contact.label + ":", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(contact.value, 60, y);
      y += 10;
    });

    // ====== Generate PDF ======
    const pdfBuffer = doc.output('arraybuffer');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="TechBlogAI_MediaKit.pdf"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: Buffer.from(pdfBuffer).toString('base64'),
      isBase64Encoded: true
    };
    
  } catch (err) {
    console.error("PDF generation error:", err);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: "Failed to generate PDF",
        message: err.message,
        note: "Please email advertise@techblogai.com for the media kit"
      })
    };
  }
};