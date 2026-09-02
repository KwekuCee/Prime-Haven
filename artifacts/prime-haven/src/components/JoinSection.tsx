import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const JoinSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto border-y border-border/60">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
            {/* Clients */}
            <div className="py-14 lg:pr-14 space-y-5">
              <span className="eyebrow">Got something to build</span>
              <h3 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight leading-[1.1] text-foreground">
                Tell us what you need <span className="display-italic text-primary">made</span>
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Send over the idea — even if it is rough. We will tell you honestly what it takes, what it
                costs, and how long it will run before you commit to anything.
              </p>
              <p className="text-sm text-muted-foreground">
                Matched with the right person · Progress you can follow · Paid in stages, not upfront
              </p>
              <div className="pt-2">
                <Link to="/start-project">
                  <Button variant="primary" size="lg" className="group">
                    Start a project
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Freelancers */}
            <div className="py-14 lg:pl-14 space-y-5">
              <span className="eyebrow">Looking for work</span>
              <h3 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight leading-[1.1] text-foreground">
                Get paid for work you're <span className="display-italic text-primary">proud of</span>
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                Join the network as a designer or developer. Real client projects, a portfolio that grows
                with every delivery, and a share of what the work earns.
              </p>
              <p className="text-sm text-muted-foreground">
                No bidding · Contracts sent to you · Monthly payouts to your mobile money
              </p>
              <div className="pt-2">
                <Link to="/register">
                  <Button variant="primary" size="lg" className="group">
                    Join the network — GH₵100
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <p className="text-muted-foreground text-sm mt-3">One-time fee · Instant access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
