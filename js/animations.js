// Animation Utilities

export const animateValue = (obj, start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // easeOutQuart
        const easeOut = 1 - Math.pow(1 - progress, 4);
        
        const current = Math.floor(start + (end - start) * easeOut);
        obj.innerHTML = current.toLocaleString();
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            // Flash color based on direction
            if (end > start) {
                obj.classList.remove('flash-red');
                obj.classList.add('flash-green');
                setTimeout(() => obj.classList.remove('flash-green'), 1000);
            } else if (end < start) {
                obj.classList.remove('flash-green');
                obj.classList.add('flash-red');
                setTimeout(() => obj.classList.remove('flash-red'), 1000);
            }
        }
    };
    window.requestAnimationFrame(step);
};

// FLIP Animation Helper for lists
export class FLIP {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        this.positions = new Map();
    }

    read() {
        if (!this.container) return;
        const children = Array.from(this.container.children);
        children.forEach(child => {
            child.style.transition = '';
            child.style.transform = '';
            this.positions.set(child.id, child.getBoundingClientRect());
        });
    }

    play() {
        if (!this.container) return;
        const children = Array.from(this.container.children);
        
        // Calculate deltas and apply inverse transform
        children.forEach(child => {
            const oldPos = this.positions.get(child.id);
            if (!oldPos) {
                // New element, animate entrance
                child.classList.add('animate-add');
                return;
            }
            
            const newPos = child.getBoundingClientRect();
            const deltaY = oldPos.top - newPos.top;
            
            if (deltaY !== 0) {
                child.style.transform = `translateY(${deltaY}px)`;
                child.style.transition = 'none';
            }
        });

        // Force reflow
        this.container.offsetHeight;

        // Play transition
        children.forEach(child => {
            child.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
            child.style.transform = '';
            setTimeout(() => {
                child.classList.remove('animate-add');
            }, 500);
        });
    }
}
