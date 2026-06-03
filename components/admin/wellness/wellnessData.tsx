export type Meal = {
  id: string;
  icon: string;
  name: string;
  slot: string;
  tag: string;
  kcal: number;
  ingredients: { name: string; qty: string }[];
  nutrition: { label: string; value: string }[];
  tips: string;
};

export const MEALS: Meal[] = [
  {
    id: "bagel",
    icon: "🥯",
    name: "Sujuk protein bagel",
    slot: "Meal 1",
    tag: "High satiety · good before work",
    kcal: 560,
    ingredients: [
      { name: "Bagel", qty: "1 whole" },
      { name: "Eggs", qty: "2 large" },
      { name: "Sujuk slices", qty: "60 g" },
      { name: "Spinach", qty: "large handful" },
      { name: "Avocado", qty: "½ (optional)" },
      { name: "Olive oil / butter", qty: "1 tsp" },
    ],
    nutrition: [
      { label: "Calories", value: "~560 kcal" },
      { label: "Protein", value: "38 g" },
      { label: "Carbs", value: "44 g" },
      { label: "Fat", value: "24 g" },
      { label: "Fiber", value: "6 g" },
      { label: "Satiety", value: "Very high" },
    ],
    tips: "Scramble the eggs with sujuk first, then wilt spinach in the same pan. Slice avocado on the side. Keeps you full until boxing.",
  },
  {
    id: "yoghurt",
    icon: "🥣",
    name: "Yoghurt power bowl",
    slot: "Meal 1",
    tag: "High fiber · great for digestion",
    kcal: 480,
    ingredients: [
      { name: "Fage yoghurt", qty: "200 g" },
      { name: "Protein powder", qty: "1 scoop" },
      { name: "Chia seeds", qty: "1 tbsp" },
      { name: "Almonds", qty: "small handful" },
      { name: "Brain nuts", qty: "small handful" },
      { name: "Kiwi or plum", qty: "1 piece" },
    ],
    nutrition: [
      { label: "Calories", value: "~480 kcal" },
      { label: "Protein", value: "42 g" },
      { label: "Carbs", value: "28 g" },
      { label: "Fat", value: "18 g" },
      { label: "Fiber", value: "9 g" },
      { label: "Satiety", value: "High" },
    ],
    tips: "Mix the protein powder into the yoghurt first so it dissolves smoothly. Add chia seeds and let sit 2 min before eating. The kiwi is key for digestion.",
  },
  {
    id: "tofu",
    icon: "🍳",
    name: "Tofu + egg scramble",
    slot: "Meal 1",
    tag: "Best cutting meal · very low calorie",
    kcal: 420,
    ingredients: [
      { name: "Firm tofu", qty: "150 g" },
      { name: "Eggs", qty: "2 large" },
      { name: "Spinach", qty: "large handful" },
      { name: "Broccoli", qty: "80 g" },
      { name: "Coriander", qty: "small handful" },
      { name: "½ bagel or ½ avocado", qty: "optional" },
    ],
    nutrition: [
      { label: "Calories", value: "~420 kcal" },
      { label: "Protein", value: "36 g" },
      { label: "Carbs", value: "22 g" },
      { label: "Fat", value: "20 g" },
      { label: "Fiber", value: "7 g" },
      { label: "Satiety", value: "High" },
    ],
    tips: "Crumble tofu into a hot pan with a little oil — cook until golden. Add eggs and scramble together. Wilt spinach and broccoli in last 2 min. Finish with coriander.",
  },
  {
    id: "falafel",
    icon: "🥗",
    name: "Edamame falafel bowl",
    slot: "Meal 2",
    tag: "Very high fiber · best post-workout",
    kcal: 520,
    ingredients: [
      { name: "Falafel", qty: "3–4 pieces" },
      { name: "Edamame", qty: "80 g" },
      { name: "Cucumber", qty: "½" },
      { name: "Spinach", qty: "large handful" },
      { name: "Avocado", qty: "½" },
      { name: "Coriander", qty: "handful" },
      { name: "Fage yoghurt (sauce)", qty: "3 tbsp" },
    ],
    nutrition: [
      { label: "Calories", value: "~520 kcal" },
      { label: "Protein", value: "30 g" },
      { label: "Carbs", value: "38 g" },
      { label: "Fat", value: "22 g" },
      { label: "Fiber", value: "14 g" },
      { label: "Satiety", value: "Very high" },
    ],
    tips: "Warm the falafel in a pan or air fryer. Mix yoghurt with lemon juice and a pinch of salt for the sauce. Layer everything in a bowl — don't overthink it.",
  },
  {
    id: "pasta",
    icon: "🍝",
    name: "High protein pasta",
    slot: "Meal 2",
    tag: "Comfort meal · use on heavy boxing days",
    kcal: 560,
    ingredients: [
      { name: "Pasta penne", qty: "75 g dry" },
      { name: "Firm tofu", qty: "120 g" },
      { name: "Broccoli", qty: "100 g" },
      { name: "Spinach", qty: "large handful" },
      { name: "Coriander", qty: "handful" },
      { name: "Olive oil", qty: "1 tbsp" },
      { name: "Light tomato sauce", qty: "3 tbsp" },
    ],
    nutrition: [
      { label: "Calories", value: "~560 kcal" },
      { label: "Protein", value: "32 g" },
      { label: "Carbs", value: "58 g" },
      { label: "Fat", value: "16 g" },
      { label: "Fiber", value: "10 g" },
      { label: "Satiety", value: "High" },
    ],
    tips: "Keep the pasta portion to 75 g dry — your fullness should come from the tofu, broccoli and spinach, not the pasta itself. Good for heavy boxing days when you need the carbs.",
  },
  {
    id: "salad",
    icon: "🥙",
    name: "Loaded protein salad",
    slot: "Meal 2",
    tag: "Highest fiber · best for focus days",
    kcal: 420,
    ingredients: [
      { name: "Eggs", qty: "2 large" },
      { name: "Edamame", qty: "80 g" },
      { name: "Avocado", qty: "½" },
      { name: "Cucumber", qty: "½" },
      { name: "Spinach", qty: "large handful" },
      { name: "Coriander", qty: "handful" },
      { name: "Almonds + chia seeds", qty: "topping" },
    ],
    nutrition: [
      { label: "Calories", value: "~420 kcal" },
      { label: "Protein", value: "28 g" },
      { label: "Carbs", value: "20 g" },
      { label: "Fat", value: "26 g" },
      { label: "Fiber", value: "13 g" },
      { label: "Satiety", value: "High" },
    ],
    tips: "Boil or poach the eggs — soft yolk is best. Toss everything together and sprinkle almonds and chia seeds on top. Lightest of the dinner options — good if you trained light.",
  },
];

export const SCHEDULE_ITEMS = [
  { time: "7:00 AM", title: "Wake up + water", desc: "500 ml water immediately. Black coffee or green tea allowed. Fast is still running.", color: "#7F77DD", badge: null },
  { time: "7–8 AM", title: "Quran / religion study", desc: "Protected hour. Phone away. Sets the tone for the whole day — this comes before everything.", color: "#7B2D3E", badge: "non-negotiable" },
  { time: "8:00 AM", title: "Deep work — Veilora", desc: "Sharpest fasted hours of the day. Sip water constantly. Build, focus, execute.", color: "#378ADD", badge: null },
  { time: "11:00 AM", title: "Short break", desc: "5–10 min. Stand up, stretch, more water. Black coffee if needed. Keep fasting.", color: "#c4a898", badge: null },
  { time: "11 AM–3 PM", title: "Work continues", desc: "Calls, deep work, building. Last stretch of the fast — you're almost there.", color: "#378ADD", badge: null },
  { time: "3:00 PM", title: "Meal 1 — break the fast", desc: "Biggest meal of the day. High protein + fiber. Sit down, eat properly, no rushing.", color: "#1D9E75", badge: "~550 kcal · 35–40 g protein" },
  { time: "3:30–5:30 PM", title: "Final work block", desc: "Fuelled and focused. Wrap up the day, close loops, review tasks.", color: "#378ADD", badge: null },
  { time: "5:30 PM", title: "Finish work + get ready", desc: "Change, pack kit, head out. Done for the day — now it's your time.", color: "#D85A30", badge: null },
  { time: "6:00 PM", title: "Walk to boxing/gym", desc: "~30 min walk. Natural warm-up. First ~3–4k steps of the day.", color: "#D85A30", badge: null },
  { time: "7:00 PM", title: "Boxing / gym session", desc: "45–60 min. Alternate boxing and strength days per the weekly plan. Full effort.", color: "#7B2D3E", badge: "~500–700 kcal burn" },
  { time: "8:00 PM", title: "Clear protein drink", desc: "Drink immediately while cooling down. Muscles are primed — best absorption window. ~35 g protein.", color: "#378ADD", badge: "drink right after session" },
  { time: "8–8:30 PM", title: "Walk home", desc: "~30 min cool-down walk. 10 k+ steps done without tracking anything.", color: "#D85A30", badge: null },
  { time: "9:00 PM", title: "Meal 2 — post-workout dinner", desc: "Lighter than meal 1. High fiber, moderate protein, some carbs to refuel.", color: "#1D9E75", badge: "~500 kcal · 28–32 g protein" },
  { time: "9:45 PM", title: "Wind down", desc: "Light stretch if sore. Phone down. Water only. Eating window closes 10 PM.", color: "#c4a898", badge: "fast begins" },
  { time: "10:30 PM", title: "Sleep", desc: "7.5–8 hrs to 7 AM. Fat loss and muscle repair happen here — protect it.", color: "#7B2D3E", badge: null },
];

export const WORKOUT_WEEKS = [
  {
    label: "Week 1–2",
    subtitle: "Foundation",
    days: [
      { day: "Monday", type: "boxing", title: "Boxing", desc: "45 min. Focus on technique and cardio rounds. ~600 kcal burn." },
      { day: "Tuesday", type: "strength", title: "Strength — upper body", desc: "Push-ups 3×12 · dumbbell rows 3×10 · shoulder press 3×10 · plank 3×30 s" },
      { day: "Wednesday", type: "rest", title: "Active recovery", desc: "The walk to boxing and back counts. Let muscles recover. No gym work." },
      { day: "Thursday", type: "boxing", title: "Boxing", desc: "45 min. Bag work + footwork drills." },
      { day: "Friday", type: "strength", title: "Strength — lower body", desc: "Squats 3×15 · lunges 3×12 · glute bridges 3×15 · core circuit 15 min" },
      { day: "Saturday", type: "rest", title: "Long walk", desc: "60 min relaxed walk. Podcast, explore, reset mentally." },
      { day: "Sunday", type: "rest", title: "Full rest", desc: "Light stretch only. Sleep well. Recover fully." },
    ],
  },
  {
    label: "Week 3–4",
    subtitle: "Build",
    days: [
      { day: "Monday", type: "boxing", title: "Boxing (60 min)", desc: "Add combination drills. Push intensity up from weeks 1–2." },
      { day: "Tuesday", type: "strength", title: "Strength — upper (heavier)", desc: "Increase reps to 15. Add resistance bands or heavier dumbbells where possible." },
      { day: "Wednesday", type: "boxing", title: "Boxing or incline walk", desc: "3rd boxing session OR 30 min incline treadmill walk at the gym." },
      { day: "Thursday", type: "strength", title: "Strength — full body", desc: "Squat + press + row + core. 45 min compound session." },
      { day: "Friday", type: "rest", title: "Active recovery", desc: "60 min walk. Stretch. Mobility work if sore." },
      { day: "Saturday", type: "rest", title: "Outdoor walk", desc: "10,000 steps. Go somewhere enjoyable." },
      { day: "Sunday", type: "rest", title: "Rest + meal prep", desc: "Prep meals for the week ahead. Sleep well." },
    ],
  },
  {
    label: "Week 5–6",
    subtitle: "Push",
    days: [
      { day: "Monday", type: "boxing", title: "Boxing (hard session)", desc: "60 min high intensity. Push yourself harder than before." },
      { day: "Tuesday", type: "strength", title: "Strength — heavy (8–10 reps)", desc: "Heavier weights, lower reps. Compound lifts only." },
      { day: "Wednesday", type: "boxing", title: "Boxing", desc: "60 min. Sparring or advanced combination drills if possible." },
      { day: "Thursday", type: "strength", title: "Strength + HIIT finisher", desc: "40 min strength + 10 min HIIT: burpees / jump rope / sprints" },
      { day: "Friday", type: "boxing", title: "Boxing or cardio", desc: "3rd boxing session or 30 min cardio of choice." },
      { day: "Saturday", type: "rest", title: "Easy walk", desc: "8,000 steps. Let your body breathe." },
      { day: "Sunday", type: "rest", title: "Rest", desc: "You've earned it. Sleep 8 hours." },
    ],
  },
  {
    label: "Week 7–8",
    subtitle: "Finish strong",
    days: [
      { day: "Monday", type: "boxing", title: "Boxing (max effort)", desc: "60–75 min. Best sessions of the entire programme." },
      { day: "Tuesday", type: "strength", title: "Strength — peak week", desc: "Note your PRs. Compare to week 1. You've improved significantly." },
      { day: "Wednesday", type: "boxing", title: "Boxing", desc: "Feel how much better you move compared to week 1." },
      { day: "Thursday", type: "strength", title: "Strength + finisher", desc: "Full body circuit. Sweat everything out." },
      { day: "Friday", type: "rest", title: "Reflective walk", desc: "10 k steps. Think about what you've built over 8 weeks." },
      { day: "Saturday", type: "rest", title: "Light activity", desc: "Gentle walk or yoga. Celebrate what you've achieved." },
      { day: "Sunday", type: "rest", title: "Final weigh-in + rest", desc: "Morning weigh-in before eating. You did it." },
    ],
  },
];

export const PRAYERS = [
  { name: "Fajr", time: "~4:30 AM" },
  { name: "Dhuhr", time: "~1:10 PM" },
  { name: "Asr", time: "~5:20 PM" },
  { name: "Maghrib", time: "~9:00 PM" },
  { name: "Isha", time: "~10:30 PM" },
];