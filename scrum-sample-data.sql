-- Sample data for Scrum Learning Hub
-- Run this after scrum-database-setup.sql

-- Insert sample takeaways for Chapter 1: Introduction to Scrum
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(1, 'Introduction to Scrum', 'Scrum is an agile framework that helps teams work together to deliver value incrementally'),
(1, 'Introduction to Scrum', 'The three pillars of Scrum are transparency, inspection, and adaptation'),
(1, 'Introduction to Scrum', 'Scrum events are time-boxed to create regularity and minimize waste'),
(1, 'Introduction to Scrum', 'The Scrum Team consists of Product Owner, Scrum Master, and Developers');

-- Insert sample takeaways for Chapter 2: Scrum Roles
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(2, 'Scrum Roles', 'The Product Owner is accountable for maximizing the value of the product'),
(2, 'Scrum Roles', 'The Scrum Master serves the team by facilitating events and removing impediments'),
(2, 'Scrum Roles', 'Developers are accountable for creating a usable increment each Sprint'),
(2, 'Scrum Roles', 'Cross-functional teams have all the skills needed to create product increments');

-- Insert sample takeaways for Chapter 3: Scrum Events
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(3, 'Scrum Events', 'Sprint Planning creates a plan for the upcoming Sprint'),
(3, 'Scrum Events', 'Daily Scrum is a 15-minute event for synchronizing activities'),
(3, 'Scrum Events', 'Sprint Review demonstrates the increment to stakeholders'),
(3, 'Scrum Events', 'Sprint Retrospective helps the team improve their process');

-- Insert sample takeaways for Chapter 4: Scrum Artifacts
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(4, 'Scrum Artifacts', 'The Product Backlog is an ordered list of features and requirements'),
(4, 'Scrum Artifacts', 'The Sprint Backlog contains items selected for the Sprint plus a plan'),
(4, 'Scrum Artifacts', 'The Increment is the sum of all completed backlog items during a Sprint'),
(4, 'Scrum Artifacts', 'Definition of Done ensures everyone understands what "complete" means');

-- Insert sample takeaways for Chapter 5: Sprint Planning
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(5, 'Sprint Planning', 'Sprint Planning answers "What" and "How" for the upcoming Sprint'),
(5, 'Sprint Planning', 'The team selects items from the Product Backlog for the Sprint'),
(5, 'Sprint Planning', 'Capacity planning helps determine how much work can be done'),
(5, 'Sprint Planning', 'The Sprint Goal provides focus and coherence for the Sprint');

-- Insert sample takeaways for Chapter 6: Daily Scrum Best Practices
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(6, 'Daily Scrum Best Practices', 'Focus on progress toward the Sprint Goal, not individual status'),
(6, 'Daily Scrum Best Practices', 'Identify and discuss impediments that block progress'),
(6, 'Daily Scrum Best Practices', 'Keep the meeting time-boxed to 15 minutes maximum'),
(6, 'Daily Scrum Best Practices', 'Use the meeting to plan the next 24 hours of work');

-- Insert sample takeaways for Chapter 7: Sprint Review and Retrospective
INSERT INTO public.scrum_chapter_takeaways (chapter_number, chapter_title, takeaway) VALUES
(7, 'Sprint Review and Retrospective', 'Sprint Review focuses on the product and getting feedback'),
(7, 'Sprint Review and Retrospective', 'Sprint Retrospective focuses on the process and team improvement'),
(7, 'Sprint Review and Retrospective', 'Invite stakeholders to Sprint Review for valuable feedback'),
(7, 'Sprint Review and Retrospective', 'Use retrospective techniques like Start-Stop-Continue for insights');